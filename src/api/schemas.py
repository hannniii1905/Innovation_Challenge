"""Pydantic request/response models for the FastAPI backend.

These schemas define the shapes exchanged between the React frontend and the
FastAPI backend across the human-in-the-loop pipeline:

    upload -> status -> extraction -> verification -> approve -> results

Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.6, 8.7, 9.1, 9.2, 9.3, 9.4,
           9.5, 9.6, 9.8, 10.6, 10.7, 10.8
"""

from typing import List, Optional

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Workflow stages
# --------------------------------------------------------------------------- #
# A session moves through these stages:
#   uploaded -> extracting -> awaiting_verification -> analyzing -> completed
# or transitions to `failed` if any stage errors.
STAGE_UPLOADED = "uploaded"
STAGE_EXTRACTING = "extracting"
STAGE_AWAITING_VERIFICATION = "awaiting_verification"
STAGE_ANALYZING = "analyzing"
STAGE_COMPLETED = "completed"
STAGE_FAILED = "failed"


# --------------------------------------------------------------------------- #
# Upload
# --------------------------------------------------------------------------- #
class UploadResponse(BaseModel):
    """Returned after a successful PDF upload + extraction kickoff."""

    session_id: str = Field(..., description="Unique identifier for the session.")
    stage: str = Field(..., description="Current workflow stage.")
    document_type: str = Field(
        ..., description="Identified document type: a bank id or IRAS_NOA."
    )


# --------------------------------------------------------------------------- #
# Status
# --------------------------------------------------------------------------- #
class StatusResponse(BaseModel):
    """Current workflow stage/status for the stepper UI."""

    session_id: str
    stage: str = Field(..., description="Current workflow stage.")
    document_type: Optional[str] = None
    approved: bool = Field(
        False, description="Whether the data has passed the Approval_Step."
    )
    progress: int = Field(
        0, description="Progress of the current stage, 0-100."
    )
    progress_message: str = Field(
        "", description="Human-readable description of the current backend step."
    )
    error: Optional[str] = Field(
        None, description="Error message if the stage is `failed`."
    )


# --------------------------------------------------------------------------- #
# Extraction / verification transactions
# --------------------------------------------------------------------------- #
class TransactionModel(BaseModel):
    """A single transaction as presented for verification."""

    date: str = ""
    description: str = ""
    amount: float = 0.0
    transaction_type: str = Field(
        "debit", description='Either "credit" or "debit".'
    )
    raw_text: str = ""
    is_corrected: bool = Field(
        False, description="True if a human edited this transaction."
    )


class ExtractionResponse(BaseModel):
    """Extracted fields/transactions presented for human verification.

    For bank statements `bank`, `company_name`, `statement_period`,
    `transactions` and the totals are populated. For IRAS NOA documents the
    `individual_name`, `total_income` and `year_of_assessment` fields are
    populated instead.
    """

    session_id: str
    stage: str
    document_type: str

    # Bank statement fields
    bank: Optional[str] = None
    company_name: Optional[str] = None
    statement_period: Optional[str] = None
    transactions: List[TransactionModel] = Field(default_factory=list)
    total_credits: float = 0.0
    total_debits: float = 0.0

    # IRAS NOA fields
    individual_name: Optional[str] = None
    total_income: Optional[float] = None
    year_of_assessment: Optional[str] = None

    # Tracks which top-level fields a human corrected.
    corrected_fields: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Verification (PUT)
# --------------------------------------------------------------------------- #
class VerificationRequest(BaseModel):
    """Reviewer corrections submitted prior to approval.

    All fields are optional; only provided fields are treated as corrections.
    Providing `transactions` replaces the working transaction list (each entry
    may carry an `is_corrected` flag).
    """

    bank: Optional[str] = None
    company_name: Optional[str] = None
    statement_period: Optional[str] = None
    transactions: Optional[List[TransactionModel]] = None

    individual_name: Optional[str] = None
    total_income: Optional[float] = None
    year_of_assessment: Optional[str] = None


# --------------------------------------------------------------------------- #
# Results
# --------------------------------------------------------------------------- #
class ResultsResponse(BaseModel):
    """Final analysis report returned after approval.

    Wraps the report dict produced by ``ReportGenerator``, appended with the 
    4-Stage automated underwriting framework decision matrices.
    """

    session_id: str
    stage: str
    report: dict = Field(
        ...,
        description="The full evaluation report containing transactional data and risk scores.",
        example={
            "company_name": "Acme Corp",
            "total_credits": 125000.0,
            "total_debits": 95000.0,
            # 4-Zone Underwriting Variables populated for ResultsDashboard.jsx:
            "evaluation_status": "APPROVE",
            "probability_of_default": 8.0,
            "integrity_check": "PASSED",
            "kiting_volume": 0.0,
            "true_adjusted_turnover": 125000.0,
            "requested_quantum": 50000.0,
            "max_system_cap": 18750.0,
            "recommended_offer": 18750.0,
            "justification": "Approved within standard safe operational exposure limits.",
            "engine_warnings": []
        }
    )