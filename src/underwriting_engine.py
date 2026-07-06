from html import parser
import logging
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
from src.parsers.iras_noa_parser import IrasNoaParser


logger = logging.getLogger("ocr_analyzer")

BLACKLISTED_INDUSTRIES = [
    "Casino",
    "Cryptocurrency",
    "Money Lending"
]

BLACKLISTED_COMPANIES = [
    "ABC Scam Pte Ltd"
]
    

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

        suspicious_credits = []
        loan_result = {}

        bank_type = None
        from src.document_router import DocumentRouter
        if app_record.bank_statement_path:
            try:

                engine = OCREngine(app_record.bank_statement_path)
                pages = engine.extract()
                text = "\n".join(pages)
                router = DocumentRouter(pages)
                bank_type = router.identify()
                parser_class = router.get_parser_class()
                parser = parser_class()
                transactions = parser.extract_transactions(text)
                statement_period = parser.identify_statement_period(text)

                for tx in transactions:
                    if (tx.transaction_type or "").lower() == "credit":
                        raw_credits_total += float(tx.amount or 0)

                loan_result = LoanDetector().detect(transactions)
                detected_loans_count = loan_result.get("count", 0)
                suspicious_credits = FraudDetector().analyze(
                    transactions,
                    statement_period
                )
                if suspicious_credits:
                    has_fraud_tampering = True
                    flagged_kiting_volume = sum(
                        item.transaction.amount
                        for item in suspicious_credits
                    )

            except Exception as e:
                logger.error(str(e))
                warnings.append(str(e))
        return {
            "bank": bank_type,
            "warnings": warnings,
            "raw_credits_total": raw_credits_total,
            "flagged_kiting_volume": flagged_kiting_volume,
            "loan_result": loan_result,
            "detected_loans_count": detected_loans_count,
            "has_fraud_tampering": has_fraud_tampering,
            "suspicious_credits": suspicious_credits,
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

    def _calculate_financial_ratios(self, app_record):
        return {
            "dscr": 0,
            "fcc": 0,
            "mue": 0,
            "tue": 0
        }

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
        ratio_result = self._calculate_financial_ratios(app_record)
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


















# class UnderwritingEngine:
#     def __init__(self, db: Session):
#         self.db = db
#         self.singpass_client = MockSingpassClient()
#         self.baseline_pd = 0.08  # Baseline industry risk floor of 8%



#     def execute_evaluation(self, application_id: int) -> dict:
#         """
#         Executes the 4-Stage enterprise underwriting credit framework loop.
#         Processes database files, checks cross-references, and calculates lending limits.
#         """
#         print("\n========== UNDERWRITING STARTED ==========")
#         print("Application ID:", application_id)

#         from src.document_router import DocumentRouter
#         logger.info(f"Executing automated credit appraisal for Application ID: {application_id}")
        
#         # 1. Ingestion: Retrieve the persistent tracking ledger record
#         app_record = self.db.query(StagedApplication).filter(StagedApplication.id == application_id).first()
#         if not app_record:
#             raise ValueError(f"Application ledger record not found for ID: {application_id}")
#         # In underwriting_engine.py
#         logger.info(f"File path being processed: {app_record.file_path}")
#         # 2. Extract Document Data arrays using OCR stack
#         warnings = []
#         raw_credits_total = 0.0
#         flagged_kiting_volume = 0.0
#         detected_loans_count = 0
#         has_fraud_tampering = False

#         if app_record.bank_statement_path:
#             try:
#                 # Fire existing file system parsers
#                 engine = OCREngine(app_record.bank_statement_path)
#                 pages = engine.extract()
#                 text = "\n".join(pages)
                
#                 router = DocumentRouter(pages)
#                 bank_type = router.identify()
#                 parser_class = router.get_parser_class()
#                 parser = parser_class()
                
#                 transactions = parser.extract_transactions(text)
#                 statement_period = parser.identify_statement_period(text)

#                 print("\n========== UNDERWRITING ==========")
#                 print("Transaction type:", type(transactions[0]))
#                 for tx in transactions:
#                     print(tx)
#                     print("type =", type(tx))
#                 print("=================================\n")

#                 # Calculate basic financial parameters from transactions array
#                 for tx in transactions:
#                     if tx["transaction_type"] == "credit":
#                         raw_credits_total += tx["amount"]
                
#                 # Call existing Risk & Fraud modules
#                 loan_result = LoanDetector().detect(transactions)
#                 detected_loans_count = loan_result.get("count", 0)
                
#                 suspicious_credits = FraudDetector().analyze(transactions, statement_period)
#                 # If fraud detector isolates high-risk patterns, calculate the kiting volume
#                 if len(suspicious_credits) > 0:
#                     has_fraud_tampering = True
#                     flagged_kiting_volume = sum(
#                                                     item.transaction.amount
#                                                     for item in suspicious_credits
#                                                 )
                    
#             except Exception as e:
#                 logger.error(f"OCR Pipeline processing breakdown: {str(e)}")
#                 warnings.append(f"Document parsing error: {str(e)}")

#         # 3. Connect to Experian Bureau API (Live External Verification Check)
#         experian_client = ExperianBureauClient()
#         bureau_response = experian_client.fetch_corporate_bureau_data(app_record.uen)
#         bureau_data = bureau_response.get("bureau_data", {})
        
#         # Extract operational variables from the Experian payload
#         detected_acra_charges = bureau_data.get("corporate_charges", [])
#         has_active_acra_charges = len(detected_acra_charges) > 0

#         # 4. The Cross-Check Scorecard Framework & Math Matrix
#         # Initial Baseline Setup
#         baseline_pd = 0.08
#         integrity_penalty = 0.0
#         kiting_penalty = 0.0
#         fraud_penalty = 0.0

#         # Rule A: The Honesty Cross-Check (Pre-Questionnaire vs Experian Bureau Data)
#         customer_declared_nil = app_record.declared_loans.lower() in ['nil', '0', 'none', 'no']
#         has_active_acra_charges = len(detected_acra_charges) > 0

#         if customer_declared_nil and has_active_acra_charges:
#             integrity_penalty = 0.25  # Honesty breach adds +25%

#         # Rule B: Circular Fund Flows Check
#         if flagged_kiting_volume > 0:
#             kiting_penalty = 0.30     # Kiting flags add +30%

#         # Rule C: Document Tampering Flags
#         if has_fraud_tampering:
#             fraud_penalty = 0.20      # Tampering alerts add +20%

#         # Matrix Aggregation (Capped at 99%)
#         final_pd = min(0.99, baseline_pd + integrity_penalty + kiting_penalty + fraud_penalty)

#         # 5. Sizing Rule Engine (Cash Turnover Sanitization)
#         # Deducting fake money loops from raw incoming transactions
#         true_adjusted_revenue = max(0.0, raw_credits_total - flagged_kiting_volume)
        
#         # Safe monthly/annual exposure allocation bracket limit set to 15% of true revenue
#         max_systemic_capacity = true_adjusted_revenue * 0.15
#         requested_amount = app_record.requested_quantum

#         # Decision Gate Matrix
#         if final_pd > 0.45 or true_adjusted_revenue <= 0:
#             decision = "DECLINE"
#             recommended_quantum = 0.0
#             justification = "Application hard declined by rule engine due to extreme credit volatility or artificial cash generation profiles."
#         elif requested_amount <= max_systemic_capacity:
#             decision = "APPROVE"
#             recommended_quantum = requested_amount
#             justification = f"Approved matching client request of ${requested_amount:,.2f}. Entirely within safe systemic tolerance parameters."
#         else:
#             decision = "refer_to_CA" # Counter-offer state trigger
#             recommended_quantum = max_systemic_capacity
#             justification = f"Counter-offer proposed. Customer requested ${requested_amount:,.2f} which exceeds verified safe 15% operating exposure limit."

#         # Update database application status lifecycle flag
#         app_record.status = "EVALUATED"
#         self.db.commit()

#         # Flattened structural payload package matching ResultsDashboard.jsx expectation matrix
#         return {
#             "document_type": "bank_statement",
#             "bank": bank_type,
#             "company_name": app_record.company_name,
#             "evaluation_status": decision,
#             "probability_of_default": round(final_pd * 100, 2),
#             "integrity_check": "FAILED" if integrity_penalty > 0 else "PASSED",
#             "kiting_volume": flagged_kiting_volume,
#             "total_credits": raw_credits_total,
#             "true_adjusted_turnover": true_adjusted_revenue,
#             "requested_quantum": requested_amount,
#             "max_system_cap": max_systemic_capacity,
#             "recommended_offer": recommended_quantum,
#             "justification": justification,
#             "engine_warnings": warnings,
#             "loan_repayments": loan_result,
#             "suspicious_credits": {
#                 "count": len(suspicious_credits),
#                 "transactions": suspicious_credits
#             }
#         }