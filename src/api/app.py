"""FastAPI application wrapping the OCR extraction/analysis engine.

Exposes a small REST API that drives the human-in-the-loop pipeline:

    POST /api/upload                       -> create session, run extraction
    GET  /api/sessions/{id}/status         -> current workflow stage/status
    GET  /api/sessions/{id}/extraction     -> extracted data for verification
    PUT  /api/sessions/{id}/verification   -> store corrections, recalc totals
    POST /api/sessions/{id}/approve        -> verify + run downstream analysis
    GET  /api/sessions/{id}/results        -> final report (incl. credit-kiting)

Downstream analysis (loan/fraud/credit-kiting) only runs after the explicit
Approval_Step, satisfying the human-in-the-loop gating requirement.

Validates: Requirements 8.1-8.7, 9.1-9.8, 10.1-10.8
"""

import os
import json
import shutil
import tempfile
import threading
from typing import List, Optional, Tuple

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from src.database import init_db, get_db, StagedApplication
from src.underwriting_engine import UnderwritingEngine

from src.api.schemas import (
    STAGE_ANALYZING,
    STAGE_AWAITING_VERIFICATION,
    STAGE_COMPLETED,
    STAGE_EXTRACTING,
    STAGE_FAILED,
    STAGE_UPLOADED,
    ExtractionResponse,
    ResultsResponse,
    StatusResponse,
    TransactionModel,
    UploadResponse,
    VerificationRequest,
)

from src.api.session_store import Session as OCRSession
from src.api.session_store import SessionStore
from src.credit_kiting import CreditKitingDetector
from src.document_router import (
    DOCUMENT_TYPE_IRAS_NOA,
    DocumentRouter,
    UnsupportedDocumentError,
)

from src.fraud_detector import FraudDetector
from src.loan_detector import LoanDetector
from src.ocr_engine import OCREngine, OCREngineError
from src.parsers.base_parser import Transaction
from src.parsers.iras_noa_parser import IrasNoaParser
from src.reporter import ReportGenerator

# Maximum upload size: 10 MB.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# Allowed dev origins for the React frontend.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app = FastAPI(
    title="OCR Financial Statement Analyzer API",
    description=(
        "Wraps the PDF extraction/analysis engine and drives the "
        "human-in-the-loop verification workflow."
    ),
    version="1.0.0",
)

UPLOAD_DIR = "uploaded_applications"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/client/submit")
async def submit_client_application(
    profile_id: int = Form(...),
    uen: str = Form(...),
    company_name: str = Form(...),
    industry: str = Form(""),
    requested_quantum: float = Form(...),
    loan_tenure_months: int = Form(...),
    monthly_installment: float = Form(0),
    loan_purpose: str = Form("Working Capital"),
    declared_loans: str = Form("NIL"),
    pre_questionnaire_json: str = Form("{}"),
    singpass_profile_json: str = Form("{}"),
    credit_bureau_consent: str = Form("NO"),
    bank_statement: UploadFile = File(...),
    income_statement: UploadFile = File(...),
    ic_copy: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        application = StagedApplication(
            status="PENDING",
            uen=uen,
            company_name=company_name,
            requested_quantum=requested_quantum,
            declared_loans=declared_loans,
            pre_questionnaire_json=json.loads(pre_questionnaire_json),
            singpass_profile_json=json.loads(singpass_profile_json),
        )

        db.add(application)
        db.commit()
        db.refresh(application)

        app_folder = os.path.join(UPLOAD_DIR, f"application_{application.id}")
        os.makedirs(app_folder, exist_ok=True)

        bank_path = os.path.join(app_folder, bank_statement.filename)
        income_path = os.path.join(app_folder, income_statement.filename)
        ic_path = os.path.join(app_folder, ic_copy.filename)

        with open(bank_path, "wb") as f:
            shutil.copyfileobj(bank_statement.file, f)

        with open(income_path, "wb") as f:
            shutil.copyfileobj(income_statement.file, f)

        with open(ic_path, "wb") as f:
            shutil.copyfileobj(ic_copy.file, f)

        application.bank_statement_path = bank_path
        application.income_statement_path = income_path

        db.commit()
        db.refresh(application)

        engine = UnderwritingEngine(db)
        result = engine.execute_evaluation(application.id)

        decision = (
            result.get("evaluation_status")
            or result.get("decision")
            or "APPROVE"
        )

        risk_flags = result.get("risk_flags") or result.get("engine_warnings") or []
        decision_upper = str(decision).upper()

        if decision_upper in ["APPROVE", "APPROVED"]:
            ai_recommendation = "APPROVED"
            review_category = "APPROVED"

        elif decision_upper in ["DECLINE", "REJECT", "REJECTED"]:
            ai_recommendation = "NEEDS_FURTHER_REVIEW"
            review_category = "REJECT_RECOMMENDED"

        else:
            ai_recommendation = "NEEDS_FURTHER_REVIEW"
            review_category = "MANUAL_REVIEW_REQUIRED"

        application.system_decision = ai_recommendation
        application.system_reason = result.get("justification", "")
        application.risk_flags = risk_flags
        application.approved_amount = result.get("recommended_offer", requested_quantum)

        db.commit()
        db.refresh(application)
        return {
            "application_id": application.id,
            "reference_number": f"APP-2026-{str(application.id).zfill(6)}",
            "ai_recommendation": ai_recommendation,
            "review_category": review_category,
            "recommended_amount": result.get("recommended_offer", requested_quantum),
            "status": "PENDING_FINAL_CREDIT_APPROVAL",
            "raw_result": result,
        }
        

    except Exception as e:
        import traceback

        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/approver/applications")
def list_approver_applications(db: Session = Depends(get_db)):
    applications = (
        db.query(StagedApplication)
        .order_by(StagedApplication.id.desc())
        .all()
    )

    rows = []

    for app in applications:
        system_decision = app.system_decision or "NEEDS_FURTHER_REVIEW"

        risk_flags = app.risk_flags or []
        risk_text = " ".join(str(x).lower() for x in risk_flags)

        if system_decision == "APPROVED":
            review_category = "APPROVED"
        elif (
            "blacklist" in risk_text
            or "sanction" in risk_text
            or "fraud" in risk_text
            or "decline" in risk_text
            or app.status == "REJECTED"
        ):
            review_category = "REJECT_RECOMMENDED"
        else:
            review_category = "MANUAL_REVIEW_REQUIRED"

        rows.append(
            {
                "application_id": app.id,
                "reference_number": f"APP-2026-{str(app.id).zfill(6)}",
                "company_name": app.company_name,
                "uen": app.uen,
                "requested_quantum": app.requested_quantum,
                "status": app.status,
                "system_decision": system_decision,
                "review_category": review_category,
                "approved_amount": app.approved_amount,
                "created_at": str(getattr(app, "created_at", "")),
            }
        )

    total = len(rows)
    approved = len([x for x in rows if x["system_decision"] == "APPROVED"])
    further_review = len([x for x in rows if x["system_decision"] != "APPROVED"])

    return {
        "summary": {
            "total_applications": total,
            "approved_count": approved,
            "further_review_count": further_review,
            "approved_percentage": round((approved / total) * 100, 1) if total else 0,
            "further_review_percentage": round((further_review / total) * 100, 1) if total else 0,
        },
        "applications": rows,
    }

@app.get("/approver/applications/{application_id}")
def get_approver_application(application_id: int, db: Session = Depends(get_db)):
    app_record = (
        db.query(StagedApplication)
        .filter(StagedApplication.id == application_id)
        .first()
    )

    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    return {
        "application_id": app_record.id,
        "reference_number": f"APP-2026-{str(app_record.id).zfill(6)}",
        "company_name": app_record.company_name,
        "uen": app_record.uen,
        "requested_quantum": app_record.requested_quantum,
        "recommended_amount": app_record.approved_amount or app_record.requested_quantum,
        "status": app_record.status,
        "system_decision": app_record.system_decision or "PENDING_REVIEW",
        "system_reason": app_record.system_reason or "Initial automated assessment has been completed and is pending final credit approval.",
        "risk_flags": app_record.risk_flags or [],
        "credit_score": app_record.credit_score,
        "annualised_revenue": app_record.annualised_revenue,
        "dscr": app_record.dscr,
        "credit_kiting_score": app_record.credit_kiting_score,
        "existing_debt": app_record.existing_debt,
        "industry": app_record.industry,
        "approver_decision": app_record.approver_decision,
        "approver_notes": app_record.approver_notes,
    }
@app.post("/approver/applications/{application_id}/decision")
def submit_approver_decision(
    application_id: int,
    decision: str = Form(...),
    approved_amount: float = Form(0),
    approver_name: str = Form("Credit Approver"),
    approver_notes: str = Form(""),
    db: Session = Depends(get_db),
):
    app_record = (
        db.query(StagedApplication)
        .filter(StagedApplication.id == application_id)
        .first()
    )

    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    normalized = decision.upper()

    if normalized not in ["APPROVED", "SUBJECT_TO_APPROVAL", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid approver decision.")

    app_record.approver_decision = normalized
    app_record.approver_name = approver_name
    app_record.approver_notes = approver_notes
    app_record.status = normalized

    if normalized == "APPROVED":
        app_record.approved_amount = approved_amount or app_record.requested_quantum
    elif normalized == "SUBJECT_TO_APPROVAL":
        app_record.approved_amount = approved_amount
    else:
        app_record.approved_amount = 0

    db.commit()
    db.refresh(app_record)

    return {
        "application_id": app_record.id,
        "reference_number": f"APP-2026-{str(app_record.id).zfill(6)}",
        "status": app_record.status,
        "approver_decision": app_record.approver_decision,
        "approved_amount": app_record.approved_amount,
        "approver_name": app_record.approver_name,
        "approver_notes": app_record.approver_notes,
    }

@app.on_event("startup")
def startup():
    init_db()
    print("Database initialized.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single process-wide in-memory store.
store = SessionStore()


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _compute_totals(transactions: List[TransactionModel]) -> Tuple[float, float]:
    """Return (total_credits, total_debits) for the given transactions."""
    total_credits = round(
        sum(
            t.amount
            for t in transactions
            if (t.transaction_type or "").lower() == "credit"
        ),
        2,
    )
    total_debits = round(
        sum(
            t.amount
            for t in transactions
            if (t.transaction_type or "").lower() == "debit"
        ),
        2,
    )
    return total_credits, total_debits


def _to_engine_transactions(
    transactions: List[TransactionModel],
) -> List[Transaction]:
    """Convert API transaction models to engine ``Transaction`` dataclasses."""
    return [
        Transaction(
            date=t.date,
            description=t.description,
            amount=t.amount,
            transaction_type=t.transaction_type,
            raw_text=t.raw_text,
        )
        for t in transactions
    ]


def _get_session_or_404(session_id: str) -> OCRSession:
    """Fetch a session or raise HTTP 404 if it does not exist."""
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


def _run_extraction(session: OCRSession, pdf_bytes: bytes) -> None:
    """Run OCR + parsing on the uploaded bytes and populate the session.

    Saves the uploaded bytes to a temporary .pdf file (the OCR engine needs a
    file path), extracts and parses the content, then removes the temp file.
    Updates ``session.progress`` / ``session.progress_message`` throughout so
    the frontend can render a live progress bar.
    """
    session.stage = STAGE_EXTRACTING
    session.progress = 5
    session.progress_message = "Reading uploaded PDF…"

    tmp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".pdf", delete=False
        ) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        session.progress = 10
        session.progress_message = "Running OCR text extraction…"

        def _on_page(current: int, total: int) -> None:
            # Reserve 10-70% of the bar for per-page OCR extraction.
            frac = (current / total) if total else 1.0
            session.progress = 10 + int(frac * 60)
            session.progress_message = (
                f"Extracting text from page {current} of {total}…"
            )

        pages = OCREngine(tmp_path).extract(progress_callback=_on_page)

        session.progress = 72
        session.progress_message = "Identifying document type…"
        router = DocumentRouter(pages)

        print("Router object:", router)
        print("Calling identify()...")

        doc_type = router.identify()

        print("identify() returned:", doc_type)
        session.document_type = doc_type
        text = "\n".join(pages)

        if doc_type == DOCUMENT_TYPE_IRAS_NOA:
            session.progress = 85
            session.progress_message = "Parsing IRAS Notice of Assessment…"
            parsed = IrasNoaParser().parse(text)
            session.individual_name = parsed.get("individual_name")
            session.total_income = parsed.get("total_income")
            session.year_of_assessment = parsed.get("year_of_assessment")
        else:
            session.progress = 80
            session.progress_message = f"Parsing {doc_type} statement fields…"
            parser = router.get_parser_class()()
            session.bank = doc_type
            session.company_name = parser.extract_company_name(text)
            session.statement_period = parser.identify_statement_period(text)
            session.progress = 90
            session.progress_message = "Extracting transactions…"
            session.transactions = [
                TransactionModel(
                    date=t.date,
                    description=t.description,
                    amount=t.amount,
                    transaction_type=t.transaction_type,
                    raw_text=t.raw_text,
                    is_corrected=False,
                )
                for t in parser.extract_transactions(text)
            ]
        print("Detected:", doc_type)
        print("Company:", session.company_name)
        print("Transactions:", len(session.transactions))
        print("\n========== Extracted Transactions ==========")

        from dataclasses import asdict

        for i, tx in enumerate(session.transactions, start=1):
            try:
                print(f"{i}.", asdict(tx))
            except TypeError:
                print(f"{i}.", vars(tx))

        print("===========================================\n")
        session.progress = 100
        session.progress_message = "Extraction complete. Ready for review."
        session.stage = STAGE_AWAITING_VERIFICATION
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


def _build_extraction_response(session: OCRSession) -> ExtractionResponse:
    """Assemble an ExtractionResponse from the session's working data."""
    total_credits, total_debits = _compute_totals(session.transactions)
    return ExtractionResponse(
        session_id=session.session_id,
        stage=session.stage,
        document_type=session.document_type or "",
        bank=session.bank,
        company_name=session.company_name,
        statement_period=session.statement_period,
        transactions=session.transactions,
        total_credits=total_credits,
        total_debits=total_debits,
        individual_name=session.individual_name,
        total_income=session.total_income,
        year_of_assessment=session.year_of_assessment,
        corrected_fields=session.corrected_fields,
    )


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@app.post("/api/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)) -> UploadResponse:
    """Accept a PDF, validate it, create a session, and start extraction.

    Extraction runs in a background thread so this request returns immediately
    with a session id. The frontend polls ``/status`` to follow progress.
    """
    filename = file.filename or ""
    content_type = file.content_type or ""

    is_pdf = filename.lower().endswith(".pdf") or content_type == "application/pdf"
    if not is_pdf:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are accepted.",
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(pdf_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File exceeds the maximum allowed size of "
                f"{MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
            ),
        )

    session = store.create()
    session.stage = STAGE_EXTRACTING
    session.progress = 0
    session.progress_message = "Queued for extraction…"

    def _worker() -> None:
        try:
            _run_extraction(session, pdf_bytes)
        except UnsupportedDocumentError as exc:
            session.stage = STAGE_FAILED
            session.error = str(exc)
        except OCREngineError as exc:
            session.stage = STAGE_FAILED
            session.error = f"Failed to process PDF: {exc}"
        except Exception as exc:
            import traceback

            traceback.print_exc()

            session.stage = STAGE_FAILED
            session.error = str(exc)

    threading.Thread(target=_worker, daemon=True).start()

    return UploadResponse(
        session_id=session.session_id,
        stage=session.stage,
        document_type=session.document_type or "",
    )


@app.get("/api/sessions/{session_id}/status", response_model=StatusResponse)
async def get_status(session_id: str) -> StatusResponse:
    """Return the current workflow stage and status for the session."""
    session = _get_session_or_404(session_id)
    return StatusResponse(
        session_id=session.session_id,
        stage=session.stage,
        document_type=session.document_type,
        approved=session.approved,
        progress=session.progress,
        progress_message=session.progress_message,
        error=session.error,
    )


@app.get(
    "/api/sessions/{session_id}/extraction", response_model=ExtractionResponse
)
async def get_extraction(session_id: str) -> ExtractionResponse:
    """Return extracted fields/transactions for verification."""
    session = _get_session_or_404(session_id)
    return _build_extraction_response(session)


@app.put(
    "/api/sessions/{session_id}/verification", response_model=ExtractionResponse
)
async def submit_verification(
    session_id: str, corrections: VerificationRequest
) -> ExtractionResponse:
    """Store reviewer corrections and recalculate totals (no finalizing)."""
    session = _get_session_or_404(session_id)

    # Allow re-editing after a prior approval (e.g. the user navigated back
    # from the results screen). Reopening clears the stale approval + report
    # so the data must be approved again before new results are produced.
    if session.approved:
        session.approved = False
        session.report = None
        session.stage = STAGE_AWAITING_VERIFICATION

    corrected: List[str] = list(session.corrected_fields)

    def _mark(field_name: str) -> None:
        if field_name not in corrected:
            corrected.append(field_name)

    # Bank statement field corrections.
    if corrections.bank is not None:
        session.bank = corrections.bank
        _mark("bank")
    if corrections.company_name is not None:
        session.company_name = corrections.company_name
        _mark("company_name")
    if corrections.statement_period is not None:
        session.statement_period = corrections.statement_period
        _mark("statement_period")
    if corrections.transactions is not None:
        session.transactions = corrections.transactions
        _mark("transactions")

    # IRAS NOA field corrections.
    if corrections.individual_name is not None:
        session.individual_name = corrections.individual_name
        _mark("individual_name")
    if corrections.total_income is not None:
        session.total_income = corrections.total_income
        _mark("total_income")
    if corrections.year_of_assessment is not None:
        session.year_of_assessment = corrections.year_of_assessment
        _mark("year_of_assessment")

    session.corrected_fields = corrected

    # Totals are recalculated as part of building the response.
    return _build_extraction_response(session)


def _run_analysis(session: OCRSession) -> None:
    """Run downstream analysis on verified data, updating progress as it goes."""
    print(f"DEBUG: Starting _run_analysis for session {session.session_id}")
    session.stage = STAGE_ANALYZING
    session.progress = 10
    session.progress_message = "Starting analysis of verified data…"

    generator = ReportGenerator()

    if session.document_type == DOCUMENT_TYPE_IRAS_NOA:
        session.progress = 60
        session.progress_message = "Compiling IRAS assessment report…"
        report = generator.generate_iras_report(
            individual_name=session.individual_name,
            year_of_assessment=session.year_of_assessment,
            total_income=session.total_income,
            warnings=[],
        )
    else:
        engine_txns = _to_engine_transactions(session.transactions)

        session.progress = 30
        session.progress_message = "Detecting loan repayments…"
        loan_result = LoanDetector().detect(engine_txns)

        session.progress = 50
        session.progress_message = "Scanning for suspicious credits…"
        suspicious_credits = FraudDetector().analyze(
            engine_txns, session.statement_period
        )

        session.progress = 70
        session.progress_message = "Analyzing credit-kiting patterns…"
        credit_kiting = CreditKitingDetector().detect(
            engine_txns, session.statement_period
        )

        session.progress = 85
        session.progress_message = "Compiling base report entries…"
        report = generator.generate_bank_report(
            bank=session.bank,
            company_name=session.company_name,
            statement_period=session.statement_period,
            transactions=engine_txns,
            loan_result=loan_result,
            suspicious_credits=suspicious_credits,
            warnings=[],
            credit_kiting=credit_kiting,
        )

        # =====================================================================
        # NEW: 4-STAGE ENTERPRISE UNDERWRITING RULES MATRIX INTEGRATION
        # =====================================================================
        total_credits = report.get("total_credits", 0.0)
        flagged_kiting_volume = sum(float(item.get("amount", 0.0)) for item in suspicious_credits)
        true_adjusted_revenue = max(0.0, total_credits - flagged_kiting_volume)
        
        # Risk Metric Penalty Metrics
        base_pd = 8.0
        warnings_list = []
        
        if flagged_kiting_volume > 0:
            base_pd += 30.0
            warnings_list.append(f"Sanitized artificial credit loops totaling ${flagged_kiting_volume:,.2f}")
            
        if loan_result.get("count", 0) > 0:
            base_pd += 20.0
            warnings_list.append(f"Detected active external institutional leverage streams.")

        probability_of_default = min(99, base_pd)
        max_systemic_capacity = true_adjusted_revenue * 0.15
        requested_amount = 50000.0 # Standard business application baseline proxy

        # Automated Routing Matrix State
        if probability_of_default > 45 or true_adjusted_revenue <= 0:
            decision = "DECLINE"
            recommended_quantum = 0.0
            justification = "Application automatically declined due to elevated volatility metrics or high artificial kiting volume."
        elif requested_amount <= max_systemic_capacity:
            decision = "APPROVE"
            recommended_quantum = requested_amount
            justification = f"Approved within standard systemic risk tolerance profiles."
        else:
            decision = "refer_to_CA"
            recommended_quantum = max_systemic_capacity
            justification = f"Counter-offer proposed. Maximum operational commitment is capped at 15% of true adjusted turnover."

        # Flatten parameters onto the session report to meet dashboard expectations
        report.update({
            "evaluation_status": decision,
            "probability_of_default": probability_of_default,
            "integrity_check": "PASSED" if base_pd <= 20 else "FLAGGED_REVIEW",
            "kiting_volume": flagged_kiting_volume,
            "true_adjusted_turnover": true_adjusted_revenue,
            "requested_quantum": requested_amount,
            "max_system_cap": max_systemic_capacity,
            "recommended_offer": recommended_quantum,
            "justification": justification,
            "engine_warnings": warnings_list
        })

        # Save back to the tracking session state
        session.report = report
        session.stage = STAGE_COMPLETED
        session.progress = 100
        session.progress_message = "Analysis complete."


@app.post("/api/sessions/{session_id}/approve", response_model=StatusResponse)
async def approve(session_id: str) -> StatusResponse:
    """Mark data verified and start downstream analysis in the background.

    Returns immediately with the ``analyzing`` stage; the frontend polls
    ``/status`` for progress and fetches ``/results`` once completed.
    """
    session = _get_session_or_404(session_id)

    if session.stage not in (STAGE_AWAITING_VERIFICATION, STAGE_COMPLETED):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot approve from stage '{session.stage}'. "
                f"Session must be awaiting verification."
            ),
        )

    session.approved = True
    session.report = None
    session.stage = STAGE_ANALYZING
    session.progress = 0
    session.progress_message = "Queued for analysis…"

    def _worker() -> None:
        try:
            _run_analysis(session)
        except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
            session.stage = STAGE_FAILED
            session.error = f"Analysis failed: {exc}"

    threading.Thread(target=_worker, daemon=True).start()

    return StatusResponse(
        session_id=session.session_id,
        stage=session.stage,
        document_type=session.document_type,
        approved=session.approved,
        progress=session.progress,
        progress_message=session.progress_message,
        error=session.error,
    )


@app.get("/api/sessions/{session_id}/results", response_model=ResultsResponse)
async def get_results(session_id: str) -> ResultsResponse:
    """Return the final report including credit-kiting findings."""
    session = _get_session_or_404(session_id)

    if session.report is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Results are not available until the data has been approved."
            ),
        )

    return ResultsResponse(
        session_id=session.session_id,
        stage=session.stage,
        report=session.report,
    )
