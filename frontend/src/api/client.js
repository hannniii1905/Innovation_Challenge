// API client for the OCR Financial Statement Analyzer backend.
//
// All requests target relative /api/... paths. In development the Vite dev
// server proxies these to the FastAPI backend at http://localhost:8000
// (see vite.config.js), so there are no CORS concerns.
//
// Endpoint reference (shapes confirmed against src/api/schemas.py & app.py):
//   POST /api/upload                       -> { session_id, stage, document_type }
//   GET  /api/sessions/{id}/status         -> { session_id, stage, document_type, approved, error }
//   GET  /api/sessions/{id}/extraction     -> ExtractionResponse
//   PUT  /api/sessions/{id}/verification   -> ExtractionResponse (recalculated totals)
//   POST /api/sessions/{id}/approve        -> { session_id, stage, report }
//   GET  /api/sessions/{id}/results        -> { session_id, stage, report }

const BASE = "/api";

/**
 * Parse a fetch Response, raising a useful Error on non-2xx responses.
 * The backend returns FastAPI error bodies as { detail: "..." }.
 */
async function handle(response) {
  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && body.detail
        ? body.detail
        : typeof body === "string" && body
          ? body
          : `Request failed with status ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return body;
}

/**
 * Upload a PDF file (multipart form field "file"), creating a session and
 * kicking off extraction.
 * @param {File} file
 * @returns {Promise<{session_id: string, stage: string, document_type: string}>}
 */
export async function uploadDocument(file) {
  console.log("DEBUG: File object being sent:", file); // Check this in F12 console
  console.log("DEBUG: Is file a File object?", file instanceof File);
  const form = new FormData();
  // Ensure "file" matches the exact parameter name expected by your FastAPI backend
  form.append("file", file); 

  const response = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: form,
    // DO NOT set 'Content-Type': 'multipart/form-data' here!
    // The browser handles this automatically for FormData.
  });

  return handle(response);
}

/**
 * Fetch the current workflow stage/status for a session.
 * @param {string} sessionId
 */
export async function getStatus(sessionId) {
  const response = await fetch(`${BASE}/sessions/${sessionId}/status`);
  return handle(response);
}

/**
 * Fetch the extracted fields/transactions for human verification.
 * @param {string} sessionId
 */
export async function getExtraction(sessionId) {
  const response = await fetch(`${BASE}/sessions/${sessionId}/extraction`);

  return handle(response);  
}

/**
 * Submit reviewer corrections. Only provided fields are treated as
 * corrections; totals are recalculated server-side and returned.
 * @param {string} sessionId
 * @param {object} corrections - subset of VerificationRequest fields
 */
export async function submitVerification(sessionId, corrections) {
  const response = await fetch(`${BASE}/sessions/${sessionId}/verification`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corrections),
  });
  return handle(response);
}

/**
 * Approve the verified data, which triggers downstream analysis and returns
 * the final report.
 * @param {string} sessionId
 */
export async function approveSession(sessionId) {
  const response = await fetch(`${BASE}/sessions/${sessionId}/approve`, {
    method: "POST",
  });
  return handle(response);
}

/**
 * Fetch the final analysis report (only available after approval).
 * @param {string} sessionId
 */
export async function getResults(sessionId) {
  const response = await fetch(`${BASE}/sessions/${sessionId}/results`);
  return handle(response);
}

//new

const API_BASE = "http://127.0.0.1:8000";

export async function submitApplication(application) {
  const formData = new FormData();

  formData.append("profile_id", application.profile.id);
  formData.append("uen", application.profile.uen);
  formData.append("company_name", application.profile.companyName);
  formData.append("industry", application.profile.industry || "");
  formData.append("requested_quantum", application.loanAmount);
  formData.append("loan_tenure_months", application.tenure);
  formData.append("monthly_installment", application.monthlyInstallment || 0);
  formData.append("loan_purpose", application.loanPurpose || "Working Capital");

  formData.append(
    "declared_loans",
    application.declarations?.existingLoans === "yes"
      ? application.declarations?.existingLoanDetails || "YES"
      : "NIL"
  );

  formData.append(
    "pre_questionnaire_json",
    JSON.stringify(application.declarations || {})
  );

  formData.append(
    "singpass_profile_json",
    JSON.stringify(application.singpass?.company || application.profile)
  );

  formData.append(
    "personal_guarantors_json",
    JSON.stringify(application.personalGuarantors || [])
  );

  formData.append("pg_coverage", application.pgCoverage ?? 0);

  formData.append(
    "credit_bureau_consent",
    application.consent?.creditBureau ? "YES" : "NO"
  );

  // Bank statement is mandatory; supporting docs are optional and may be
  // uploaded later, so only append the ones that are present.
  formData.append("bank_statement", application.uploads.bankStatement);
  if (application.uploads.incomeStatement) {
    formData.append("income_statement", application.uploads.incomeStatement);
  }
  if (application.uploads.ic) {
    formData.append("ic_copy", application.uploads.ic);
  }
  if (application.uploads.financials) {
    formData.append("financials", application.uploads.financials);
  }

  const response = await fetch(`${API_BASE}/client/submit`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Application submission failed.");
  }

  return response.json();
}

/**
 * Fetch which documents are currently on file for a submitted application.
 * @param {number} applicationId
 */
export async function getApplicationDocuments(applicationId) {
  const response = await fetch(
    `${API_BASE}/client/applications/${applicationId}/documents`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to load application documents.");
  }

  return response.json();
}

/**
 * Attach supporting documents to an already-submitted application. Any subset
 * of { incomeStatement, ic, financials, bankStatement } may be provided.
 * @param {number} applicationId
 * @param {object} uploads
 */
export async function uploadSupportingDocuments(applicationId, uploads = {}) {
  const formData = new FormData();
  if (uploads.incomeStatement) {
    formData.append("income_statement", uploads.incomeStatement);
  }
  if (uploads.ic) {
    formData.append("ic_copy", uploads.ic);
  }
  if (uploads.financials) {
    formData.append("financials", uploads.financials);
  }
  if (uploads.bankStatement) {
    formData.append("bank_statement", uploads.bankStatement);
  }

  const response = await fetch(
    `${API_BASE}/client/applications/${applicationId}/documents`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to upload supporting documents.");
  }

  return response.json();
}

export async function getApproverApplications() {
  const response = await fetch(`${API_BASE}/approver/applications`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to load applications.");
  }

  return response.json();
}

export async function getApproverApplication(applicationId) {
  const response = await fetch(`${API_BASE}/approver/applications/${applicationId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to load application.");
  }

  return response.json();
}

export async function submitApproverDecision(
  applicationId,
  decision,
  approvedAmount,
  approverNotes
) {
  const formData = new FormData();

  formData.append("decision", decision);
  formData.append("approved_amount", approvedAmount || 0);
  formData.append("approver_name", "Credit Approver");
  formData.append("approver_notes", approverNotes || "");

  const response = await fetch(
    `${API_BASE}/approver/applications/${applicationId}/decision`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to submit approver decision.");
  }

  return response.json();
}

// --------------------------------------------------------------------------- //
// ACRA lookup + keyman approval (mock)
// These use the Vite /api proxy to the FastAPI backend.
// --------------------------------------------------------------------------- //

/**
 * Look up a company and its keymen (directors) by UEN from the mock ACRA
 * registry. Used by the "no Singpass/Corppass" retrieve-by-UEN path.
 * @param {string} uen
 */
export async function acraLookup(uen) {
  const response = await fetch(
    `${BASE}/acra/company?uen=${encodeURIComponent(uen)}`
  );
  return handle(response);
}

/**
 * Ask the backend to notify a company's ACRA keymen to approve an application
 * submitted by a non-keyman applicant. Non-blocking for the demo.
 * @param {{uen: string, applicantName?: string, applicantEmail?: string}} params
 */
export async function requestKeymanApproval({ uen, applicantName, applicantEmail }) {
  const form = new FormData();
  form.append("uen", uen);
  form.append("applicant_name", applicantName || "");
  form.append("applicant_email", applicantEmail || "");

  const response = await fetch(`${BASE}/keyman/request-approval`, {
    method: "POST",
    body: form,
  });
  return handle(response);
}
