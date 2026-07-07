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

from src.api.acra_client import lookup_company, request_keyman_approval
from src.mock_data.company_profiles import COMPANY_PROFILES
from src.mock_data.property_data import lookup_property
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

# Allowed dev origins for the React frontend. The explicit list covers the
# common Vite/CRA ports; the regex below additionally permits ANY localhost /
# 127.0.0.1 port, so the app keeps working when Vite auto-bumps to 5174, 5175,
# etc. because another dev server is already holding 5173.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Matches http://localhost:<port> and http://127.0.0.1:<port> for any port.
ALLOWED_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1):\d+"

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


CBS_FAIL_GRADES = {"HH", "HX", "HZ"}


def _profile_by_uen(uen: str):
    """Look up a demo company profile by UEN (for coherent CBS / litigation)."""
    if not uen:
        return None
    target = str(uen).strip().upper()
    for prof in COMPANY_PROFILES.values():
        if str(prof.get("uen", "")).strip().upper() == target:
            return prof
    return None


def _build_underwriting_summary(app_record, result: dict) -> dict:
    """Assemble a JSON-serializable evidence bundle for the approver view.

    Combines the underwriting engine output (bank OCR, AML/blacklist) with the
    demo company profile (CBS grade, litigation) and the shareholders captured
    from Singpass/MyInfo Business at application time.
    """
    result = result or {}
    profile = _profile_by_uen(app_record.uen)

    # --- Bank statement OCR (sanitized; drop non-serializable objects) ---
    bank = result.get("bank") or {}
    raw_credits = bank.get("suspicious_credits") or []
    bank_ocr = {
        "bank": bank.get("bank"),
        "total_credits": round(float(bank.get("raw_credits_total", 0) or 0), 2),
        "flagged_kiting_volume": round(float(bank.get("flagged_kiting_volume", 0) or 0), 2),
        "detected_loans": bank.get("detected_loans_count", 0),
        "has_fraud_tampering": bool(bank.get("has_fraud_tampering", False)),
        "suspicious_credits": [
            {
                "date": sc.transaction.date,
                "description": sc.transaction.description,
                "amount": sc.transaction.amount,
                "transaction_type": sc.transaction.transaction_type,
                "raw_text": sc.transaction.raw_text,
                "risk_score": sc.risk_score,
                "reason": sc.reason,
            }
            for sc in raw_credits
        ],
    }

    # --- Credit Bureau (CBS) rating — prefer the profile grade for coherence ---
    cb = result.get("credit_bureau") or {}
    grade = (profile or {}).get("credit_bureau_grade") or cb.get("risk_grade")
    credit_bureau = {
        "grade": grade,
        "passed": grade is not None and grade not in CBS_FAIL_GRADES,
    }

    # --- Shareholders (from Singpass / MyInfo Business captured at apply time) ---
    singpass = app_record.singpass_profile_json or {}
    shareholders = singpass.get("keymen") or []

    acra = {
        "company_status": (profile or {}).get("company_status") or "Live Company",
        "registration_date": (profile or {}).get("incorporation_date")
        or singpass.get("incorporationDate"),
        "shareholders": [
            {
                "name": s.get("name"),
                "role": s.get("role"),
                "shareholding": s.get("shareholding"),
            }
            for s in shareholders
        ],
    }

    # --- Litigation search (from profile) ---
    lit_count = int((profile or {}).get("litigation_count", 0) or 0)
    charges = (profile or {}).get("corporate_charges", []) or []
    adverse = bool((profile or {}).get("has_adverse_bureau_records", False))
    litigation = {
        "count": lit_count,
        "charges": charges,
        "has_adverse_bureau_records": adverse,
        "high_risk": lit_count > 0 or adverse,
        "passed": not (lit_count > 0 or adverse),
    }

    # --- AML / sanctions & blacklist screening (from engine) ---
    bl = result.get("blacklist") or {}
    aml = {
        "passed": not bool(bl.get("blocked", False)),
        "reason": bl.get("reason", ""),
    }

    # --- Financial indicators computed from bank statement (matches seed_demo format) ---
    ratios = result.get("financial_ratios") or {}
    financials = {
        "annualised_revenue": ratios.get("annualised_revenue"),
        "dscr": ratios.get("dscr"),
        "ebitda": ratios.get("ebitda"),
        "ebitda_margin": ratios.get("ebitda_margin"),
        "tnw": ratios.get("tnw"),
        "industry": ratios.get("industry"),
        "industry_income_factor": ratios.get("industry_income_factor"),
        "serviceable_income": ratios.get("serviceable_income"),
        "monthly_debt_service": ratios.get("monthly_debt_service"),
        "annual_debt_service": ratios.get("annual_debt_service"),
        "mue": ratios.get("mue"),
        "fcc": ratios.get("fcc"),
        "existing_debt": ratios.get("existing_debt"),
        "existing_debt_items": ratios.get("existing_debt_items") or [],
    }
    credit_kiting = {
        "score": ratios.get("credit_kiting_score", 0),
        "findings": ratios.get("credit_kiting_findings") or [],
    }

    # --- Credit Flash Model: probability of default + approved limit ---
    risk_model = _run_credit_flash_model(
        app_record, bank_ocr, credit_bureau, litigation, aml
    )

    return {
        "bank_ocr": bank_ocr,
        "credit_bureau": credit_bureau,
        "acra": acra,
        "litigation": litigation,
        "aml": aml,
        "risk_model": risk_model,
        "financials": financials,
        "credit_kiting": credit_kiting,
    }


# Probability-of-default baseline by credit bureau grade (percent).
_GRADE_PD = {
    "AA": 1.5, "BB": 2.5, "CC": 5.0, "DD": 8.0, "EE": 12.0,
    "FF": 18.0, "GG": 25.0, "HH": 40.0, "HX": 55.0, "HZ": 70.0,
}


def _run_credit_flash_model(app_record, bank_ocr, credit_bureau, litigation, aml) -> dict:
    """A lightweight 'Credit Flash' PD model + limit recommendation (demo).

    Produces a probability of default from the credit bureau grade adjusted for
    behavioural/risk signals, and an indicative approved limit.
    """
    grade = credit_bureau.get("grade")
    pd = _GRADE_PD.get(grade, 10.0)

    reasons = []
    if bank_ocr.get("flagged_kiting_volume", 0) > 0:
        pd += 8.0
        reasons.append("Credit-kiting patterns detected")
    if bank_ocr.get("has_fraud_tampering"):
        pd += 10.0
        reasons.append("Bank statement integrity flag")
    if litigation.get("high_risk"):
        pd += 6.0
        reasons.append("Outstanding litigation / charges")
    if not aml.get("passed", True):
        pd += 20.0
        reasons.append("AML / blacklist hit")

    pg_coverage = float(app_record.pg_coverage or 0)
    if pg_coverage < 50:
        pd += 4.0
        reasons.append("PG shareholding coverage below 50%")

    pgs = app_record.personal_guarantors_json or []
    if any((p.get("age") or 0) >= 70 for p in pgs):
        pd += 5.0
        reasons.append("A personal guarantor is 70 or older")

    pd = max(1.0, min(95.0, round(pd, 1)))

    if pd < 5:
        band = "Low"
    elif pd < 15:
        band = "Moderate"
    elif pd < 30:
        band = "Elevated"
    else:
        band = "High"

    # Indicative approved limit.
    requested = float(app_record.requested_quantum or 0)
    hard_fail = (not aml.get("passed", True)) or (not credit_bureau.get("passed", True))
    if hard_fail:
        approved_limit = 0.0
    elif pd <= 15:
        approved_limit = requested
    elif pd <= 30:
        approved_limit = round(requested * 0.6 / 1000) * 1000  # counter-offer
    else:
        approved_limit = 0.0

    return {
        "model_name": "Credit Flash Model",
        "model_version": "v1.2",
        "pd_percent": pd,
        "rating_band": band,
        "approved_limit": approved_limit,
        "requested_amount": requested,
        "drivers": reasons,
    }


def _save_upload(app_folder: str, upload: Optional[UploadFile]) -> Optional[str]:
    """Persist an uploaded file into the application folder.

    Returns the saved path, or None when no file was provided. Tolerates the
    various "empty upload" shapes FastAPI/browsers can send for optional file
    fields (None, or an UploadFile with an empty filename).
    """
    if upload is None or not getattr(upload, "filename", ""):
        return None
    os.makedirs(app_folder, exist_ok=True)
    dest = os.path.join(app_folder, upload.filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    return dest


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
    personal_guarantors_json: str = Form("[]"),
    pg_coverage: float = Form(0),
    credit_bureau_consent: str = Form("NO"),
    bank_statement: UploadFile = File(...),
    income_statement: Optional[UploadFile] = File(None),
    ic_copy: Optional[UploadFile] = File(None),
    financials: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    try:
        application = StagedApplication(
            status="PENDING",
            uen=uen,
            company_name=company_name,
            industry=industry,
            requested_quantum=requested_quantum,
            declared_loans=declared_loans,
            pre_questionnaire_json=json.loads(pre_questionnaire_json),
            singpass_profile_json=json.loads(singpass_profile_json),
            personal_guarantors_json=json.loads(personal_guarantors_json),
            pg_coverage=pg_coverage,
        )

        db.add(application)
        db.commit()
        db.refresh(application)

        app_folder = os.path.join(UPLOAD_DIR, f"application_{application.id}")
        os.makedirs(app_folder, exist_ok=True)

        # Bank statement is mandatory; the rest are optional supporting docs
        # that may also be uploaded later.
        application.bank_statement_path = _save_upload(app_folder, bank_statement)

        income_path = _save_upload(app_folder, income_statement)
        if income_path:
            application.income_statement_path = income_path

        ic_path = _save_upload(app_folder, ic_copy)
        if ic_path:
            application.ic_path = ic_path

        financials_path = _save_upload(app_folder, financials)
        if financials_path:
            application.financials_path = financials_path

        db.commit()
        db.refresh(application)

        engine = UnderwritingEngine(db)
        result = engine.execute_evaluation(application.id)

        # Persist a JSON-serializable evidence bundle for the approver workbench.
        flash_limit = None
        try:
            summary = _build_underwriting_summary(application, result)
            application.underwriting_json = summary
            flash_limit = (summary.get("risk_model") or {}).get("approved_limit")
        except Exception:  # noqa: BLE001 - evidence is best-effort, never block submit
            import traceback

            traceback.print_exc()

        # Persist computed financial indicators on the application record.
        ratios = result.get("financial_ratios") or {}
        application.annualised_revenue = ratios.get("annualised_revenue")
        application.dscr = ratios.get("dscr")
        application.existing_debt = ratios.get("existing_debt")
        application.existing_debt_items = ratios.get("existing_debt_items") or []
        application.credit_kiting_score = ratios.get("credit_kiting_score")

        # Derive the decision from the coherent Credit Flash evidence bundle
        # (the legacy engine hardcodes DSCR=0 and would flag every case).
        uw = application.underwriting_json or {}
        cb = uw.get("credit_bureau", {})
        aml_res = uw.get("aml", {})
        lit = uw.get("litigation", {})
        rm = uw.get("risk_model", {})
        pd = rm.get("pd_percent", 10)
        drivers = rm.get("drivers", []) or []
        cbs_ok = cb.get("passed", True)
        aml_ok = aml_res.get("passed", True)

        if not cbs_ok or not aml_ok or pd > 30:
            ai_recommendation = "NEEDS_FURTHER_REVIEW"
            review_category = "REJECT_RECOMMENDED"
            app_status = "REJECTED"
            reason = "Adverse credit bureau grade / screening or high probability of default. Declined."
        elif pd >= 12 or lit.get("high_risk") or drivers:
            ai_recommendation = "NEEDS_FURTHER_REVIEW"
            review_category = "MANUAL_REVIEW_REQUIRED"
            app_status = "PENDING"
            reason = "Elevated risk indicators require manual credit review."
        else:
            ai_recommendation = "APPROVED"
            review_category = "APPROVED"
            app_status = "PENDING"
            reason = "Clean bureau grade and low probability of default. Auto-approved within risk tolerance."

        application.system_decision = ai_recommendation
        application.system_reason = reason
        application.risk_flags = drivers
        application.status = app_status
        application.approved_amount = (
            flash_limit if flash_limit is not None else requested_quantum
        )

        db.commit()
        db.refresh(application)
        return {
            "application_id": application.id,
            "reference_number": f"APP-2026-{str(application.id).zfill(6)}",
            "ai_recommendation": ai_recommendation,
            "review_category": review_category,
            "recommended_amount": application.approved_amount,
            "status": app_status,
            "raw_result": result,
        }
        

    except Exception as e:
        import traceback

        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/client/applications/{application_id}/documents")
def get_application_documents(application_id: int, db: Session = Depends(get_db)):
    """Return which documents are on file for an application.

    Supports the "come back later to upload supporting documents" flow: the
    client can see what's already uploaded and what's still outstanding.
    """
    app_record = (
        db.query(StagedApplication)
        .filter(StagedApplication.id == application_id)
        .first()
    )
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    def _name(path):
        return os.path.basename(path) if path else None

    return {
        "application_id": app_record.id,
        "reference_number": f"APP-2026-{str(app_record.id).zfill(6)}",
        "company_name": app_record.company_name,
        "documents": {
            "bank_statement": _name(app_record.bank_statement_path),
            "income_statement": _name(app_record.income_statement_path),
            "ic": _name(app_record.ic_path),
            "financials": _name(app_record.financials_path),
        },
    }


@app.post("/client/applications/{application_id}/documents")
async def upload_application_documents(
    application_id: int,
    income_statement: Optional[UploadFile] = File(None),
    ic_copy: Optional[UploadFile] = File(None),
    financials: Optional[UploadFile] = File(None),
    bank_statement: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Attach supporting documents to an already-submitted application.

    All fields are optional; any subset can be uploaded. Lets an applicant
    return after submission to provide IC, financials, or the income statement.
    """
    app_record = (
        db.query(StagedApplication)
        .filter(StagedApplication.id == application_id)
        .first()
    )
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    app_folder = os.path.join(UPLOAD_DIR, f"application_{app_record.id}")
    updated = []

    bank_path = _save_upload(app_folder, bank_statement)
    if bank_path:
        app_record.bank_statement_path = bank_path
        updated.append("bank_statement")

    income_path = _save_upload(app_folder, income_statement)
    if income_path:
        app_record.income_statement_path = income_path
        updated.append("income_statement")

    ic_path = _save_upload(app_folder, ic_copy)
    if ic_path:
        app_record.ic_path = ic_path
        updated.append("ic")

    financials_path = _save_upload(app_folder, financials)
    if financials_path:
        app_record.financials_path = financials_path
        updated.append("financials")

    db.commit()
    db.refresh(app_record)

    def _name(path):
        return os.path.basename(path) if path else None

    return {
        "application_id": app_record.id,
        "reference_number": f"APP-2026-{str(app_record.id).zfill(6)}",
        "updated": updated,
        "documents": {
            "bank_statement": _name(app_record.bank_statement_path),
            "income_statement": _name(app_record.income_statement_path),
            "ic": _name(app_record.ic_path),
            "financials": _name(app_record.financials_path),
        },
    }


@app.get("/approver/applications")
def list_approver_applications(
    decided: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    query = db.query(StagedApplication)
    if decided is True:
        query = query.filter(StagedApplication.approver_decision.isnot(None))
    elif decided is False:
        query = query.filter(StagedApplication.approver_decision.is_(None))
    applications = query.order_by(StagedApplication.id.desc()).all()

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
                "approver_decision": app.approver_decision,
                "created_at": str(getattr(app, "created_at", "")),
            }
        )

    total = len(rows)
    approved = len([x for x in rows if x["review_category"] == "APPROVED"])
    rejected = len([x for x in rows if x["review_category"] == "REJECT_RECOMMENDED"])
    further_review = len(
        [x for x in rows if x["review_category"] == "MANUAL_REVIEW_REQUIRED"]
    )

    def pct(n):
        return round((n / total) * 100, 1) if total else 0

    return {
        "summary": {
            "total_applications": total,
            "approved_count": approved,
            "further_review_count": further_review,
            "rejected_count": rejected,
            "approved_percentage": pct(approved),
            "further_review_percentage": pct(further_review),
            "rejected_percentage": pct(rejected),
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
        # Evidence for the credit decision workbench
        "singpass_profile": app_record.singpass_profile_json,
        "personal_guarantors": app_record.personal_guarantors_json or [],
        "pg_coverage": app_record.pg_coverage,
        "underwriting": app_record.underwriting_json or {},
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

    if normalized not in ["APPROVED", "SUBJECT TO APPROVAL", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid approver decision.")

    app_record.approver_decision = normalized
    app_record.approver_name = approver_name
    app_record.approver_notes = approver_notes
    app_record.status = normalized

    if normalized == "APPROVED":
        app_record.approved_amount = approved_amount or app_record.requested_quantum
    elif normalized == "SUBJECT TO APPROVAL":
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


@app.delete("/approver/applications/{application_id}")
def delete_approver_application(application_id: int, db: Session = Depends(get_db)):
    """Delete an application from the queue and its uploaded files."""
    app_record = (
        db.query(StagedApplication)
        .filter(StagedApplication.id == application_id)
        .first()
    )

    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    app_folder = os.path.join(UPLOAD_DIR, f"application_{application_id}")
    if os.path.isdir(app_folder):
        shutil.rmtree(app_folder, ignore_errors=True)

    db.delete(app_record)
    db.commit()

    return {
        "application_id": application_id,
        "deleted": True,
    }


# --------------------------------------------------------------------------- #
# ACRA lookup + keyman approval (mock)
# --------------------------------------------------------------------------- #
@app.get("/api/acra/company")
def acra_company_lookup(uen: str):
    """Look up a company (and its keymen) by UEN from the mock ACRA registry.

    Backs the "no Singpass/Corppass" path where an applicant (e.g. a foreign
    director) retrieves the registered company profile by typing in the UEN.
    """
    if not uen or not uen.strip():
        raise HTTPException(status_code=400, detail="A UEN is required.")
    return lookup_company(uen)


@app.post("/api/keyman/request-approval")
def keyman_request_approval(
    uen: str = Form(...),
    applicant_name: str = Form(""),
    applicant_email: str = Form(""),
):
    """Notify the company's ACRA keymen to approve a non-keyman's application.

    Mock/demo stub: it "sends" approval emails (logged server-side) and returns
    the notified keymen. It does not block the application flow.
    """
    if not uen or not uen.strip():
        raise HTTPException(status_code=400, detail="A UEN is required.")
    return request_keyman_approval(uen, applicant_name, applicant_email)


@app.on_event("startup")
def startup():
    init_db()
    print("Database initialized.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
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


# --------------------------------------------------------------------------- #
# Property / Satellite-map lookup (mock)
# --------------------------------------------------------------------------- #


@app.get("/api/property/lookup")
async def property_lookup(address: str = ""):
    """Return mock property details (coordinates, owner, land tenure) for a
    given registered address. Returns 404 if the address is not recognised."""
    if not address:
        raise HTTPException(status_code=400, detail="address query parameter is required.")

    record = lookup_property(address)
    if record is None:
        raise HTTPException(status_code=404, detail="No property record found for this address.")

    return record
