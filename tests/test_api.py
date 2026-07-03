"""API tests for the FastAPI backend using FastAPI's TestClient.

Covers the full human-in-the-loop flow:

    upload -> status -> extraction -> verification -> approve -> results

plus validation and error-handling paths (bad file type, oversized upload,
unknown session, approving before verification, results before approval).

Validates: Requirements 8.1, 8.2, 8.6, 8.7, 9.1, 9.3, 9.4, 9.5, 9.8,
           10.6, 10.7, 10.8
"""

import os
import time

import pytest
from fastapi.testclient import TestClient

from src.api.app import MAX_UPLOAD_BYTES, app, store
from src.api.schemas import (
    STAGE_AWAITING_VERIFICATION,
    STAGE_COMPLETED,
    STAGE_FAILED,
)

# Sample PDF with a director's advance / capital injection (credit-kiting).
SAMPLE_PDF = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "mock_maybank_sme_statement.pdf",
)


@pytest.fixture
def client():
    """Provide a TestClient with a clean session store per test."""
    store.clear()
    with TestClient(app) as test_client:
        yield test_client
    store.clear()


def _wait_for_stage(client, session_id, target_stage, timeout=30.0):
    """Poll the status endpoint until the session reaches target_stage.

    Extraction and analysis run in background threads, so tests poll the
    status endpoint (as the frontend does) instead of expecting synchronous
    completion.
    """
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        last = client.get(f"/api/sessions/{session_id}/status").json()
        if last["stage"] == target_stage:
            return last
        if last["stage"] == STAGE_FAILED:
            raise AssertionError(f"Session failed: {last.get('error')}")
        time.sleep(0.05)
    raise AssertionError(
        f"Timed out waiting for stage '{target_stage}'; last status: {last}"
    )


def _upload_sample(client) -> str:
    """Upload the sample Maybank PDF, wait for extraction, return session id."""
    with open(SAMPLE_PDF, "rb") as fh:
        response = client.post(
            "/api/upload",
            files={"file": ("statement.pdf", fh, "application/pdf")},
        )
    assert response.status_code == 200, response.text
    session_id = response.json()["session_id"]
    _wait_for_stage(client, session_id, STAGE_AWAITING_VERIFICATION)
    return session_id


# --------------------------------------------------------------------------- #
# Full happy-path flow
# --------------------------------------------------------------------------- #
def test_full_upload_verify_approve_results_flow(client):
    """upload -> status -> extraction -> verify -> approve -> results."""
    # 1. Upload (and wait for background extraction to finish).
    session_id = _upload_sample(client)

    # 2. Status: should be awaiting verification, not yet approved.
    status = client.get(f"/api/sessions/{session_id}/status").json()
    assert status["stage"] == STAGE_AWAITING_VERIFICATION
    assert status["approved"] is False
    assert status["document_type"] == "MAYBANK"

    # 3. Extraction: bank fields and transactions populated.
    extraction = client.get(f"/api/sessions/{session_id}/extraction").json()
    assert extraction["document_type"] == "MAYBANK"
    assert extraction["company_name"]
    assert len(extraction["transactions"]) > 0
    original_credits = extraction["total_credits"]
    assert original_credits > 0

    # 4. Verification: correct the company name and edit a transaction amount.
    transactions = extraction["transactions"]
    first = transactions[0]
    first["amount"] = first["amount"] + 1000.0
    first["is_corrected"] = True

    verify_payload = {
        "company_name": "VERIFIED CO PTE LTD",
        "transactions": transactions,
    }
    verified = client.put(
        f"/api/sessions/{session_id}/verification", json=verify_payload
    )
    assert verified.status_code == 200, verified.text
    verified_body = verified.json()
    assert verified_body["company_name"] == "VERIFIED CO PTE LTD"
    assert "company_name" in verified_body["corrected_fields"]
    assert "transactions" in verified_body["corrected_fields"]
    # Stage must remain awaiting verification (not finalized).
    assert verified_body["stage"] == STAGE_AWAITING_VERIFICATION

    # 5. Approve: kicks off background analysis; wait for completion.
    approved = client.post(f"/api/sessions/{session_id}/approve")
    assert approved.status_code == 200, approved.text
    _wait_for_stage(client, session_id, STAGE_COMPLETED)

    # 6. Results: report present with verified company name + credit-kiting.
    results = client.get(f"/api/sessions/{session_id}/results")
    assert results.status_code == 200, results.text
    results_report = results.json()["report"]
    assert results_report["document_type"] == "bank_statement"
    assert results_report["company_name"] == "VERIFIED CO PTE LTD"
    assert results_report["credit_kiting"]["count"] >= 1
    patterns = {
        f["pattern"] for f in results_report["credit_kiting"]["findings"]
    }
    assert "related_party_injection" in patterns
    # Findings reference triggering transactions.
    assert all(
        "related_transactions" in f
        for f in results_report["credit_kiting"]["findings"]
    )


def test_verification_recalculates_totals(client):
    """Editing a transaction amount recalculates the totals."""
    session_id = _upload_sample(client)
    extraction = client.get(f"/api/sessions/{session_id}/extraction").json()
    transactions = extraction["transactions"]

    # Find the first credit and bump it by a known amount.
    credit_index = next(
        i
        for i, t in enumerate(transactions)
        if t["transaction_type"] == "credit"
    )
    before_credits = extraction["total_credits"]
    transactions[credit_index]["amount"] += 5000.0

    verified = client.put(
        f"/api/sessions/{session_id}/verification",
        json={"transactions": transactions},
    ).json()
    assert verified["total_credits"] == pytest.approx(before_credits + 5000.0)


# --------------------------------------------------------------------------- #
# Validation / error handling
# --------------------------------------------------------------------------- #
def test_upload_rejects_non_pdf(client):
    """A non-PDF upload is rejected with HTTP 400."""
    response = client.post(
        "/api/upload",
        files={"file": ("notes.txt", b"hello world", "text/plain")},
    )
    assert response.status_code == 400
    assert "PDF" in response.json()["detail"]


def test_upload_rejects_oversized_file(client):
    """An oversized upload is rejected with HTTP 400."""
    big = b"%PDF-1.4" + b"0" * (MAX_UPLOAD_BYTES + 1)
    response = client.post(
        "/api/upload",
        files={"file": ("big.pdf", big, "application/pdf")},
    )
    assert response.status_code == 400
    assert "size" in response.json()["detail"].lower()


def test_status_unknown_session_returns_404(client):
    """Querying an unknown session returns HTTP 404."""
    response = client.get("/api/sessions/does-not-exist/status")
    assert response.status_code == 404


def test_results_before_approval_returns_409(client):
    """Requesting results before approval returns HTTP 409."""
    session_id = _upload_sample(client)
    response = client.get(f"/api/sessions/{session_id}/results")
    assert response.status_code == 409


def test_approve_unknown_session_returns_404(client):
    """Approving an unknown session returns HTTP 404."""
    response = client.post("/api/sessions/does-not-exist/approve")
    assert response.status_code == 404
