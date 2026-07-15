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
from src.mock_data.company_profiles import COMPANY_PROFILES
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
    "Manufacturing": 0.10,
    "Construction": 0.15,
    "Retail": 0.07,
    "Wholesale Trade": 0.12,
    "Wholesale": 0.12,
    "Services": 0.13,
    "Technology": 0.13,
    "Food & Beverage": 0.10,
    "Healthcare": 0.13,
    "Education": 0.13,
    "Transportation": 0.12,
    "Real Estate": 0.12,
    "Agriculture": 0.10,
    "Energy": 0.12,
    "Financial Services": 0.13,
    "Insurance": 0.13,
    "Hospitality": 0.10,
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

    def _calculate_financial_ratios(
        self,
        app_record,
        bank_result,
        income_result,
    ):
        raw_credits = float(
            bank_result.get("raw_credits_total", 0) or 0
        )

        flagged_kiting_volume = float(
            bank_result.get("flagged_kiting_volume", 0) or 0
        )

        # Turnover after suspicious credits are removed.
        true_adjusted_turnover = bank_result.get(
            "true_adjusted_turnover"
        )

        if true_adjusted_turnover is None:
            true_adjusted_turnover = max(
                raw_credits - flagged_kiting_volume,
                0.0,
            )
        else:
            true_adjusted_turnover = float(
                true_adjusted_turnover or 0
            )

        loan_result = bank_result.get("loan_result") or {}
        loan_repayments = loan_result.get("repayments") or []

        statement_period = bank_result.get("statement_period")
        statement_periods = (
            bank_result.get("statement_periods") or []
        )
        statement_documents = (
            bank_result.get("documents") or []
        )

        industry = self._resolve_industry_group(app_record)

        # --------------------------------------------------
        # Statement coverage
        # --------------------------------------------------

        coverage_days = self._parse_coverage_days(
            statement_period
        )

        statement_count = (
            len(statement_documents)
            or len(statement_periods)
        )

        # Each uploaded document represents one monthly statement.
        # Six statements therefore represent approximately six months.
        if statement_count > 1:
            coverage_days = round(
                statement_count * 365 / 12
            )

        # --------------------------------------------------
        # Annualised revenue
        # --------------------------------------------------

        income_revenue = float(
            income_result.get("revenue", 0) or 0
        )

        if true_adjusted_turnover > 0 and coverage_days > 0:
            # Prefer month-based annualisation when coverage represents full months
            if statement_count and statement_count > 0:
                months = statement_count
            else:
                months = max(1, round(coverage_days / 30))

            annualised_revenue = round(
                float(true_adjusted_turnover) / months * 12,
                2,
            )
        elif income_revenue > 0:
            annualised_revenue = round(
                income_revenue,
                2,
            )
        else:
            annualised_revenue = 0.0

        # --------------------------------------------------
        # Existing debt
        # --------------------------------------------------

        recurring_deductions = (
            self._find_recurring_deductions(
                loan_repayments,
                coverage_days,
            )
        )

        existing_monthly = round(
            recurring_deductions.get("monthly", 0) or 0,
            2,
        )

        existing_debt = round(existing_monthly * 12, 2)

        existing_debt_items = (
            recurring_deductions.get("items") or []
        )

        # --------------------------------------------------
        # Serviceable income
        # --------------------------------------------------

        factor = INDUSTRY_INCOME_FACTORS.get(
            industry,
            0.15,
        )

        serviceable_income = round(
            annualised_revenue * factor,
            2,
        )

        # --------------------------------------------------
        # New facility debt service
        # --------------------------------------------------

        tenure_months = int(
            app_record.loan_tenure_months or 12
        )

        requested_quantum = float(
            app_record.requested_quantum or 0
        )

        loan_years = max(
            tenure_months / 12,
            1,
        )

        annual_principal = (
            requested_quantum / loan_years
        )

        annual_interest = (
            requested_quantum * INTEREST_RATE
        )

        new_annual_instalment = (
            annual_principal + annual_interest
        )

        # Respect explicit monthly installment if provided on the application
        if getattr(app_record, "monthly_installment", None) not in (None, ""):
            new_monthly_installment = float(app_record.monthly_installment or 0)
            new_annual_instalment = round(new_monthly_installment * 12, 2)
        else:
            new_monthly_installment = round(new_annual_instalment / 12, 2)

        total_debt_service = (
            existing_debt + new_annual_instalment
        )

        monthly_debt_service = round(
            existing_monthly + new_monthly_installment,
            2,
        )

        # --------------------------------------------------
        # EBITDA and TNW (need EBITDA for FCC calculation)
        # --------------------------------------------------

        ebitda = income_result.get("ebitda")
        tnw = income_result.get("tnw")

        # --------------------------------------------------
        # DSCR and FCC
        # --------------------------------------------------

        dscr = (
            round(
                serviceable_income
                / total_debt_service,
                2,
            )
            if total_debt_service > 0
            else None
        )

        # Prefer an EBITDA-based fixed-charge coverage (FCC) when EBITDA
        # is available; otherwise fall back to the prototype DSCR-style
        # calculation. This prevents FCC from always equalling DSCR.
        if ebitda is not None and total_debt_service > 0:
            try:
                fcc = round(float(ebitda) / total_debt_service, 2)
            except Exception:
                fcc = None
        else:
            fcc = (
                round(
                    serviceable_income
                    / total_debt_service,
                    2,
                )
                if total_debt_service > 0
                else None
            )

        ebitda_margin = None

        if ebitda is not None and annualised_revenue > 0:
            ebitda_margin = round(
                float(ebitda)
                / annualised_revenue
                * 100,
                1,
            )

        # Keep your existing prototype MUE calculation.
        mue = (
            round(annualised_revenue / 6, 2)
            if annualised_revenue > 0
            else None
        )

        # --------------------------------------------------
        # Credit-kiting result
        # --------------------------------------------------

        credit_kiting_findings = (
            bank_result.get(
                "credit_kiting_findings"
            )
            or []
        )

        credit_kiting_score = (
            self._calculate_credit_kiting_score(
                credit_kiting_findings
            )
        )

        return {
            "true_adjusted_turnover": round(
                true_adjusted_turnover,
                2,
            ),
            "coverage_days": coverage_days,
            "statement_count": statement_count,

            "annualised_revenue": annualised_revenue,
            "dscr": dscr,
            "fcc": fcc,

            "ebitda": ebitda,
            "ebitda_margin": ebitda_margin,
            "tnw": tnw,

            "industry": industry,
            "industry_income_factor": factor,

            "serviceable_income": serviceable_income,
            "monthly_debt_service": monthly_debt_service,
            "annual_debt_service": round(
                total_debt_service,
                2,
            ),

            "mue": mue,
            "existing_debt": existing_debt,
            "existing_debt_items": existing_debt_items,

            "credit_kiting_score": credit_kiting_score,
            "credit_kiting_findings": [
                {
                    "pattern": finding.pattern,
                    "risk_level": finding.risk_level,
                    "explanation": finding.explanation,
                    "amounts": [
                        round(transaction.amount, 2)
                        for transaction
                        in finding.related_transactions
                    ],
                }
                for finding in credit_kiting_findings
            ],
        }
    
    @staticmethod
    def _normalize_industry_name(industry):
        if not industry:
            return ""
        value = str(industry).strip().lower()
        if any(keyword in value for keyword in ["retail", "supermarket", "department store", "store"]):
            return "Retail"
        if any(keyword in value for keyword in ["manufact", "factory", "production", "industrial", "fabricat"]):
            return "Manufacturing"
        if any(keyword in value for keyword in ["software", "app", "development", "service", "consult", "digital"]):
            return "Services"
        return ""

    def _resolve_industry_group(self, app_record):
        explicit_industry = self._normalize_industry_name(getattr(app_record, "industry", ""))
        if explicit_industry:
            return explicit_industry

        uen = str(getattr(app_record, "uen", "") or "").strip().upper()
        if uen:
            profile = None
            for prof in COMPANY_PROFILES.values():
                if str(prof.get("uen", "")).strip().upper() == uen:
                    profile = prof
                    break
            if profile:
                ssic_description = str(profile.get("ssic_description", "") or "")
                mapped = self._normalize_industry_name(ssic_description)
                if mapped:
                    return mapped

        return "Services"

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
        monthly = 0.0
        items = []

        if not loan_repayments:
            return {"annualised": 0.0, "monthly": 0.0, "items": []}

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
                monthly += amt
                annualised += amt * 12
            elif coverage_days > 0:
                monthly += (amt * count) / coverage_days * 30
                annualised += (amt * count) / coverage_days * 365
            else:
                monthly += amt * count
                annualised += amt * count

        return {"annualised": annualised, "monthly": monthly, "items": items}

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
