"""
Document Router for identifying document types and routing to appropriate parsers.

Identifies whether a PDF is a bank statement (DBS, OCBC, Maybank, UOB) or an IRAS
Notice of Assessment, then routes to the correct parser class.

Extended to support FastAPI web endpoints for client submission and RM evaluation.
"""

import os
import shutil
import json
import re
from typing import List, Optional, Type
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

# Import new backend database and engine components
from src.database import get_db, StagedApplication

# Initialize standard FastAPI router gateway instance
router = APIRouter(prefix="/api/v1")

# Create local system directories to save raw uploads if they don't exist
UPLOAD_DIR = "storage/statements"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/client/submit")
async def submit_application(
    # Company
    uen: str = Form(...),
    company_name: str = Form(...),
    industry: str = Form(...),

    # Loan Request
    requested_quantum: float = Form(...),
    loan_tenure_months: int = Form(...),
    monthly_installment: float = Form(...),

    # Existing debts
    has_existing_debts: bool = Form(...),
    declared_existing_debts: str = Form(""),

    # Customer consent
    consent_credit_bureau: bool = Form(...),

    # Singpass
    singpass_profile_json: Optional[str] = Form(None),

    # Documents
    bank_statement: UploadFile = File(...),
    income_statement: UploadFile = File(...),
    ic_copy: UploadFile = File(...),

    db: Session = Depends(get_db)
):
    """
    Ingests direct client structured form data and binary statement streams.
    Saves attachments to local disk storage arrays and registers a PENDING ledger database row.
    """
    try:
        # Save uploaded bank statement file to disk safely
        file_extension = os.path.splitext(bank_statement.filename)[1]
        safe_filename = f"bank_{uen}{file_extension}"

        bank_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(bank_path, "wb") as buffer:
            shutil.copyfileobj(bank_statement.file, buffer)
        income_extension = os.path.splitext(income_statement.filename)[1]

        income_filename = f"income_{uen}{income_extension}"
        income_path = os.path.join(
            UPLOAD_DIR,
            income_filename
        )
        with open(income_path, "wb") as buffer:
            shutil.copyfileobj(income_statement.file, buffer)

        ic_extension = os.path.splitext(ic_copy.filename)[1]
        ic_filename = f"ic_{uen}{ic_extension}"
        ic_path = os.path.join(
            UPLOAD_DIR,
            ic_filename
        )
        with open(ic_path, "wb") as buffer:
            shutil.copyfileobj(ic_copy.file, buffer)
            
        # Parse serialized questionnaire input blocks safely back into dictionary arrays
       
        parsed_singpass = json.loads(singpass_profile_json) if singpass_profile_json else None

        # Build structural row schema instantiation mapping row inputs
        new_application = StagedApplication(
            status="PENDING",
            uen=uen,
            company_name=company_name,
            industry=industry,
            requested_quantum=requested_quantum,
            loan_tenure_months=loan_tenure_months,
            monthly_installment=monthly_installment,
            has_existing_debts=has_existing_debts,
            declared_existing_debts=declared_existing_debts,
            consent_credit_bureau=consent_credit_bureau,
            singpass_profile_json=parsed_singpass,
            bank_statement_paths=bank_path,
            income_statement_path=income_path,
            ic_path=ic_path
        )

        db.add(new_application)
        db.commit()
        db.refresh(new_application)

        from src.underwriting_engine import UnderwritingEngine
        engine = UnderwritingEngine(db)
        result = engine.execute_evaluation(new_application.id)

        return result

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record application entry: {str(e)}")


@router.get("/rm/evaluate/{application_id}")
def evaluate_application(application_id: int, db: Session = Depends(get_db)):
    """
    Invokes the automated underwriting Credit Flash scoring sequence loop.
    Extracts text, identifies fraud alerts, and generates credit decisions.
    """
    try:
        # Create instance of our credit engine and pass the db transaction scope session
        from src.underwriting_engine import UnderwritingEngine
        engine = UnderwritingEngine(db)
        evaluation_results = engine.execute_evaluation(application_id)
        return evaluation_results
        
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal appraisal runtime error execution loop: {str(e)}")


class UnsupportedDocumentError(Exception):
    """Raised when the document does not match any supported format."""
    pass


# Supported document type identifiers
DOCUMENT_TYPE_DBS = "DBS"
DOCUMENT_TYPE_OCBC = "OCBC"
DOCUMENT_TYPE_MAYBANK = "MAYBANK"
DOCUMENT_TYPE_UOB = "UOB"
DOCUMENT_TYPE_IRAS_NOA = "IRAS_NOA"

# Keywords for IRAS NOA detection
IRAS_NOA_KEYWORDS = [
    "notice of assessment",
    "iras",
    "inland revenue authority of singapore",
    "inland revenue",
    "year of assessment",
]

# Bank identification keywords mapped to their identifiers
BANK_KEYWORDS = {
    DOCUMENT_TYPE_DBS: [
        "dbs",
        "dbs bank",
        "development bank of singapore",
        "dbs business",
    ],
    DOCUMENT_TYPE_OCBC: [
        "ocbc",
        "oversea-chinese banking",
        "oversea chinese banking",
    ],
    DOCUMENT_TYPE_MAYBANK: [
        "maybank",
        "malayan banking",
    ],
    DOCUMENT_TYPE_UOB: [
        "united overseas bank",
        "uob",
    ],
}


class DocumentRouter:
    """
    Identifies document type from extracted text and routes to the appropriate parser.

    Accepts extracted text (list of page strings) from the OCR engine and determines
    whether the document is a bank statement (and from which bank) or an IRAS NOA.
    """

    def __init__(self, pages: List[str]) -> None:
        """
        Initialize the DocumentRouter with extracted page text.

        Args:
            pages: List of strings, one per page, as returned by OCREngine.extract().
        """
        self.pages = pages
        self._combined_text = "\n".join(pages).lower()

    def identify(self) -> str:
        """
        Identify the document type.

        Returns:
            A string identifier: "DBS", "OCBC", "MAYBANK", "UOB", or "IRAS_NOA".

        Raises:
            UnsupportedDocumentError: If the document does not match any supported format.
        """
        # Check for IRAS NOA first (more specific document type)
        print(">>> identify() entered <<<")

        if self._is_iras_noa():
            print("IRAS detected")
            return DOCUMENT_TYPE_IRAS_NOA

        print("Calling _identify_bank()")
        bank = self._identify_bank()

        print("Bank returned:", bank)

        if bank is not None:
            return bank

        raise UnsupportedDocumentError(...)

    def _is_iras_noa(self) -> bool:
        """
        Check if the document is an IRAS Notice of Assessment.

        Returns:
            True if IRAS NOA keywords are found in the text.
        """
        match_count = sum(
            1 for keyword in IRAS_NOA_KEYWORDS
            if keyword in self._combined_text
        )
        # Require at least 2 keyword matches to confirm IRAS NOA
        return match_count >= 2

    def _identify_bank(self):
        header = self.pages[0][:1000].lower()

        for bank_id, keywords in BANK_KEYWORDS.items():
            for keyword in keywords:
                if keyword in header:
                    return bank_id

        return None

    def get_parser_class(self) -> Type:
        """
        Get the appropriate parser class based on the identified document type.

        Returns:
            The parser class to use for this document.

        Raises:
            UnsupportedDocumentError: If the document type cannot be identified.
        """
        doc_type = self.identify()
        return self._get_parser_for_type(doc_type)

    @staticmethod
    def _get_parser_for_type(doc_type: str) -> Type:
        """
        Return the parser class for the given document type identifier.

        Uses lazy imports to avoid circular dependencies and to allow parsers
        to be implemented independently.

        Args:
            doc_type: One of "DBS", "OCBC", "MAYBANK", "UOB", or "IRAS_NOA".

        Returns:
            The parser class corresponding to the document type.

        Raises:
            UnsupportedDocumentError: If the document type is not recognized.
        """
        if doc_type == DOCUMENT_TYPE_DBS:
            from src.parsers.dbs_parser import DBSParser
            return DBSParser
        elif doc_type == DOCUMENT_TYPE_OCBC:
            from src.parsers.ocbc_parser import OCBCParser
            return OCBCParser
        elif doc_type == DOCUMENT_TYPE_MAYBANK:
            from src.parsers.maybank_parser import MaybankParser
            return MaybankParser
        elif doc_type == DOCUMENT_TYPE_UOB:
            from src.parsers.uob_parser import UOBParser
            return UOBParser
        elif doc_type == DOCUMENT_TYPE_IRAS_NOA:
            from src.parsers.iras_noa_parser import IrasNoaParser
            return IrasNoaParser
        else:
            raise UnsupportedDocumentError(
                f"No parser available for document type: '{doc_type}'"
            )
