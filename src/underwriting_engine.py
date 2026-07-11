import logging
import re
from datetime import datetime
from sqlalchemy.orm import Session
from src.database import StagedApplication
from src.api.singpass_client import MockSingpassClient
from src.api.experian_client import ExperianBureauClient
from src.api.credit_bureau_client import CreditBureauClient

# Import existing analytics pipeline blocks from current modules
from src.document_router import DocumentRouter
from src.ocr_engine import OCREngine
from src.loan_detector import LoanDetector
from src.fraud_detector import FraudDetector
from src.credit_kiting import CreditKitingDetector
from src.parsers.iras_noa_parser import IrasNoaParser
from src.statement_period_detector import detect_statement_period

logger = logging.getLogger("ocr_analyzer")

BLACKLISTED_INDUSTRIES = [
    "Casino",
    "Cryptocurrency",
    "Money Lending"
]

BLACKLISTED_COMPANIES = [
    "ABC Scam Pte Ltd"
]

INDUSTRY_INCOME_FACTORS = {
    "Manufacturing": 0.20,
    "Construction": 0.15,
    "Retail": 0.10,
    "Wholesale Trade": 0.12,
    "Wholesale": 0.12,
    "Services": 0.25,
    "Technology": 0.30,
    "Food & Beverage": 0.10,
    "Healthcare": 0.25,
    "Education": 0.20,
    "Transportation": 0.15,
    "Real Estate": 0.20,
    "Agriculture": 0.12,
    "Energy": 0.18,
    "Financial Services": 0.30,
    "Insurance": 0.25,
    "Hospitality": 0.12,
}

INTEREST_RATE = 0.0775  # indicative p.a.
    

class UnderwritingEngine:
    def __init__(self, db: Session):
        self.db = db
        self.singpass_client = MockSingpassClient()
        self.baseline_pd = 0.08  # Baseline industry risk floor of 8%

    def _load_application(self, application_id: int):
        app_record = (
            self.db.query(StagedApplication)
            .filter(StagedApplication.id == application_id)
            .first()
        )
        if not app_record:
            raise ValueError(
                f"Application ledger record not found for ID: {application_id}"
            )
        return app_record
    
    def _analyse_bank_statement(self, app_record):
        warnings = []

        raw_credits_total = 0.0
        flagged_kiting_volume = 0.0
        detected_loans_count = 0
        has_fraud_tampering = False

        all_transactions = []
        all_suspicious_credits = []
        all_credit_kiting_findings = []
        all_loan_repayments = []
        statement_results = []

        bank_type = None
        statement_periods = []

        statement_paths = app_record.bank_statement_paths or []

        if not statement_paths:
            return {
                "bank": None,
                "warnings": ["No bank statements uploaded."],
                "raw_credits_total": 0.0,
                "flagged_kiting_volume": 0.0,
                "loan_result": {
                    "count": 0,
                    "repayments": [],
                },
                "detected_loans_count": 0,
                "has_fraud_tampering": False,
                "suspicious_credits": [],
                "statement_period": None,
                "statement_periods": [],
                "credit_kiting_findings": [],
                "transactions": [],
                "documents": [],
            }

        for statement_path in statement_paths:
            try:
                engine = OCREngine(statement_path)
                pages = engine.extract()
                text = "\n".join(pages)

                router = DocumentRouter(pages)
                detected_bank = router.identify()

                parser_class = router.get_parser_class()
                parser = parser_class()

                transactions = parser.extract_transactions(text) or []
                statement_period = detect_statement_period(text)

                if bank_type is None:
                    bank_type = detected_bank

                if statement_period:
                    statement_periods.append(statement_period)

                statement_credit_total = sum(
                    float(tx.amount or 0)
                    for tx in transactions
                    if (tx.transaction_type or "").lower() == "credit"
                )

                raw_credits_total += statement_credit_total
                all_transactions.extend(transactions)

                statement_results.append({
                    "path": statement_path,
                    "filename": statement_path.split("/")[-1].split("\\")[-1],
                    "bank": detected_bank,
                    "statement_period": statement_period,
                    "transaction_count": len(transactions),
                    "credit_transaction_count": sum(
                        1
                        for tx in transactions
                        if (tx.transaction_type or "").lower() == "credit"
                    ),
                    "debit_transaction_count": sum(
                        1
                        for tx in transactions
                        if (tx.transaction_type or "").lower() == "debit"
                    ),
                    "total_credits": round(statement_credit_total, 2),
                })

            except Exception as error:
                logger.exception(
                    "Failed to analyse bank statement: %s",
                    statement_path,
                )
                warnings.append(
                    f"{statement_path}: {str(error)}"
                )

        # Run the existing detectors on the combined six-month transaction history.
        if all_transactions:
            loan_result = LoanDetector().detect(all_transactions) or {}
            detected_loans_count = loan_result.get("count", 0)
            all_loan_repayments = loan_result.get("repayments", []) or []

            combined_statement_period = (
                f"{statement_periods[0]} - {statement_periods[-1]}"
                if len(statement_periods) > 1
                else statement_periods[0]
                if statement_periods
                else None
            )

            all_suspicious_credits = FraudDetector().analyze(
                all_transactions,
                combined_statement_period,
            ) or []

            if all_suspicious_credits:
                has_fraud_tampering = True
                flagged_kiting_volume = sum(
                    float(item.transaction.amount or 0)
                    for item in all_suspicious_credits
                )

            all_credit_kiting_findings = CreditKitingDetector().detect(
                all_transactions,
                combined_statement_period,
            ) or []

        else:
            loan_result = {
                "count": 0,
                "repayments": [],
            }
            combined_statement_period = None

        return {
            "bank": bank_type,
            "warnings": warnings,
            "raw_credits_total": round(raw_credits_total, 2),
            "flagged_kiting_volume": round(flagged_kiting_volume, 2),
            "loan_result": {
                **loan_result,
                "repayments": all_loan_repayments,
            },
            "detected_loans_count": detected_loans_count,
            "has_fraud_tampering": has_fraud_tampering,
            "suspicious_credits": all_suspicious_credits,
            "statement_period": combined_statement_period,
            "statement_periods": statement_periods,
            "credit_kiting_findings": all_credit_kiting_findings,
            "transactions": all_transactions,
            "documents": statement_results,
        }

    def _analyse_income_statement(self, app_record):
        from src.parsers.income_statement_parser import IncomeStatementParser
        if not app_record.income_statement_path:
            return {
                "warnings": ["No income statement uploaded."]
            }
        engine = OCREngine(app_record.income_statement_path)
        pages = engine.extract()
        text = "\n".join(pages)
        parser = IncomeStatementParser()
        return parser.extract(text)

    def _analyse_ic(self, app_record):
        return {
            "name": "",
            "age": 0,
            "warnings": []
        }

    def _perform_acra_checks(self, app_record): #mock data
        return {
            "company_status": "LIVE",
            "registration_date": "2018-06-15",
            "industry": app_record.industry,
            "keyman": [
                {
                    "name": "John Tan",
                    "role": "Director"
                }
            ],
            "warnings": [],
            "passed": True
        }

    def _perform_litigation_checks(self, app_record): #mock data
        return {
            "cases": [],
            "high_risk": False,
            "passed": True
        }

    def _perform_credit_bureau_checks(self, app_record):
        client = CreditBureauClient()
        return client.fetch_report(app_record)
        

    def _perform_blacklist_checks(self, app_record):

        if app_record.company_name in BLACKLISTED_COMPANIES:
            return {
                "blocked": True,
                "reason": "Internal blacklist"
            }

        if app_record.industry in BLACKLISTED_INDUSTRIES:
            return {
                "blocked": True,
                "reason": "Restricted industry"
            }
        return {
            "blocked": False,
            "reason": ""
        }

    def _calculate_financial_ratios(self, app_record, bank_result, income_result):

        raw_credits = float(bank_result.get("raw_credits_total", 0) or 0)
        loan_result = bank_result.get("loan_result") or {}
        loan_repayments = loan_result.get("repayments") or []
        statement_period = bank_result.get("statement_period")
        industry = (app_record.industry or "").strip()

        # --- coverage days from statement period ---
        coverage_days = self._parse_coverage_days(statement_period)

        # --- annualised revenue ---
        income_revenue = float(income_result.get("revenue", 0) or 0)
        if income_revenue > 0:
            annualised_revenue = round(income_revenue, 2)
        elif coverage_days > 0 and raw_credits > 0:
            annualised_revenue = round(raw_credits / coverage_days * 365, 2)
        else:
            annualised_revenue = round(raw_credits, 2)

        # --- existing debt ---
        recurring_deductions = self._find_recurring_deductions(loan_repayments, coverage_days)
        existing_debt = round(recurring_deductions.get("annualised", 0), 2)
        existing_debt_items = recurring_deductions.get("items", [])

        # --- DSCR ---
        factor = INDUSTRY_INCOME_FACTORS.get(industry, 0.15)
        serviceable_income = annualised_revenue * factor

        tenure_months = int(app_record.loan_tenure_months or 12)
        annual_principal = float(app_record.requested_quantum or 0) / max(tenure_months / 12, 1)
        annual_interest = float(app_record.requested_quantum or 0) * INTEREST_RATE
        new_annual_instalment = annual_principal + annual_interest
        total_debt_service = existing_debt + new_annual_instalment
        dscr = round(serviceable_income / total_debt_service, 2) if total_debt_service > 0 else 0.0

        # --- ebitda / tnw from income statement ---
        ebitda = income_result.get("ebitda")
        tnw = income_result.get("tnw")
        ebitda_margin = None
        if ebitda and annualised_revenue > 0:
            ebitda_margin = round(ebitda / annualised_revenue * 100, 1)

        # --- monthly debt service (detected from bank statement) ---
        monthly_debt_service = round(existing_debt / 12, 2) if existing_debt > 0 else 0.0

        # --- MUE: max on-us clean exposure (~2 months turnover) ---
        mue = round(annualised_revenue / 6, 2) if annualised_revenue > 0 else None

        # --- credit kiting score ---
        ck_findings = bank_result.get("credit_kiting_findings") or []
        credit_kiting_score = self._calculate_credit_kiting_score(ck_findings)

        return {
            "annualised_revenue": annualised_revenue,
            "dscr": dscr,
            "ebitda": ebitda,
            "ebitda_margin": ebitda_margin,
            "tnw": tnw,
            "industry": industry,
            "industry_income_factor": factor,
            "serviceable_income": round(serviceable_income, 2),
            "monthly_debt_service": monthly_debt_service,
            "annual_debt_service": round(total_debt_service, 2),
            "mue": mue,
            "fcc": None,
            "existing_debt": existing_debt,
            "existing_debt_items": existing_debt_items,
            "credit_kiting_score": credit_kiting_score,
            "credit_kiting_findings": [
                {
                    "pattern": f.pattern,
                    "risk_level": f.risk_level,
                    "explanation": f.explanation,
                    "amounts": [round(t.amount, 2) for t in f.related_transactions],
                }
                for f in ck_findings
            ],
        }

    @staticmethod
    def _parse_coverage_days(statement_period):
        if not statement_period:
            return 30
        dates = re.findall(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", statement_period)
        if len(dates) < 2:
            return 30
        months = {
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
            "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
            "july": 7, "august": 8, "september": 9, "october": 10,
            "november": 11, "december": 12,
        }
        try:
            _, m1, y1 = dates[0]
            d2, m2, y2 = dates[-1]
            m1 = months.get(m1.lower(), 1)
            m2 = months.get(m2.lower(), 1)
            start = datetime(int(y1), m1, 1)
            end = datetime(int(y2), m2, int(d2))
            days = (end - start).days
            return max(days, 1)
        except Exception:
            return 30

    @staticmethod
    def _find_recurring_deductions(loan_repayments, coverage_days):
        annualised = 0.0
        items = []

        if not loan_repayments:
            return {"annualised": 0.0, "items": []}

        amount_groups = {}
        for lr in loan_repayments:
            amt = round(lr.transaction.amount, 2)
            amount_groups.setdefault(amt, []).append(lr)

        for amt, repayments in amount_groups.items():
            count = len(repayments)
            description = repayments[0].transaction.description or ""
            loan_type = repayments[0].loan_type or ""
            entry = {
                "amount": amt,
                "count": count,
                "description": description,
                "loan_type": loan_type,
            }
            items.append(entry)
            if count >= 2:
                annualised += amt * 12
            elif coverage_days > 0:
                annualised += (amt * count) / coverage_days * 365
            else:
                annualised += amt * count

        return {"annualised": annualised, "items": items}

    @staticmethod
    def _calculate_credit_kiting_score(findings):
        score = 0
        for f in findings:
            if f.risk_level == "high":
                score += 35
            elif f.risk_level == "medium":
                score += 20
            elif f.risk_level == "low":
                score += 10
        return min(score, 100)

    def _make_credit_decision(
        self,
        app_record,
        bank_result,
        income_result,
        ic_result,
        acra_result,
        litigation_result,
        bureau_result,
        blacklist_result,
        ratio_result,
    ):
        flags = []

        decision = "APPROVED"

        # ------------------------
        # Automatic Reject Rules
        # ------------------------

        if blacklist_result.get("blocked"):
            return {
                "decision": "REJECTED",
                "reason": blacklist_result["reason"],
                "flags": ["Company is on internal blacklist"]
            }

        if bureau_result.get("grade") in ["HH", "HX", "HZ"]:
            return {
                "decision": "REJECTED",
                "reason": "Poor credit bureau rating",
                "flags": [f"Credit Bureau Grade: {bureau_result['grade']}"]
            }

        # ------------------------
        # Further Review Rules
        # ------------------------

        if bank_result["flagged_kiting_volume"] > 0:
            decision = "FURTHER_REVIEW"
            flags.append("Possible credit kiting detected")

        if ic_result.get("age", 0) >= 70:
            decision = "FURTHER_REVIEW"
            flags.append("Keyman above 70 years old")

        if litigation_result.get("high_risk"):
            decision = "FURTHER_REVIEW"
            flags.append("Outstanding litigation found")

        if ratio_result.get("dscr", 999) < 1.2:
            decision = "FURTHER_REVIEW"
            flags.append("Low DSCR")

        # ------------------------
        # Approve
        # ------------------------

        return {
            "decision": decision,
            "reason": "Rule engine completed.",
            "flags": flags
        }

    def execute_evaluation(self, application_id):
        
        print("\n========== UNDERWRITING STARTED ==========")
        print("Application ID:", application_id)
        
        logger.info(
            f"Executing automated credit appraisal for Application ID: {application_id}"
        )

        app_record = self._load_application(application_id)
        bank_result = self._analyse_bank_statement(app_record)
        income_result = self._analyse_income_statement(app_record)
        ic_result = self._analyse_ic(app_record)
        acra_result = self._perform_acra_checks(app_record)
        litigation_result = self._perform_litigation_checks(app_record)
        bureau_result = self._perform_credit_bureau_checks(app_record)
        blacklist_result = self._perform_blacklist_checks(app_record)
        ratio_result = self._calculate_financial_ratios(app_record, bank_result, income_result)
        decision = self._make_credit_decision(
            app_record,
            bank_result,
            income_result,
            ic_result,
            acra_result,
            litigation_result,
            bureau_result,
            blacklist_result,
            ratio_result
        )
        return {
            "application_id": application_id,
            "company_name": app_record.company_name,
            "bank": bank_result,
            "income": income_result,
            "ic": ic_result,
            "acra": acra_result,
            "litigation": litigation_result,
            "credit_bureau": bureau_result,
            "blacklist": blacklist_result,
            "financial_ratios": ratio_result,
            "decision": decision
        }
