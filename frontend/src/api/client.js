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

// Pre-staged monthly statements the Bukku partner feed "supplies" on the
// customer's behalf. Served as static assets from frontend/public.
const BUKKU_STATEMENTS = [
  { file: "bank_statement_january_2026.pdf", month: 1, year: 2026, label: "January 2026" },
  { file: "bank_statement_february_2026.pdf", month: 2, year: 2026, label: "February 2026" },
  { file: "bank_statement_march_2026.pdf", month: 3, year: 2026, label: "March 2026" },
  { file: "bank_statement_april_2026.pdf", month: 4, year: 2026, label: "April 2026" },
  { file: "bank_statement_may_2026.pdf", month: 5, year: 2026, label: "May 2026" },
  { file: "bank_statement_june_2026.pdf", month: 6, year: 2026, label: "June 2026" },
];

async function loadBukkuStatements() {
  return Promise.all(
    BUKKU_STATEMENTS.map(async (s) => {
      const res = await fetch(`/bukku_statements/${s.file}`);
      if (!res.ok) {
        throw new Error(`Could not load Bukku statement ${s.file}.`);
      }
      const blob = await res.blob();
      const file = new File([blob], s.file, { type: "application/pdf" });
      return {
        file,
        filename: s.file,
        month: s.month,
        year: s.year,
        periodLabel: s.label,
      };
    })
  );
}

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

  const profileData = {
    ...(application.singpass?.company || application.profile),
    propertyOwnership: application.propertyOwnership || null,
    rentAmount: application.rentAmount || null,
  };
  formData.append(
    "singpass_profile_json",
    JSON.stringify(profileData)
  );

  // Personal guarantors: strip out the browser File objects (which don't
  // serialize to JSON) before sending the metadata, and upload each manual
  // guarantor's IC / IRAS NOA as separate files tagged with the guarantor's
  // name so the backend can map file -> guarantor.
  const guarantors = application.personalGuarantors || [];
  const guarantorsMeta = guarantors.map(({ icFile, irasFile, ...rest }) => ({
    ...rest,
    hasIcUpload: !!icFile,
    hasIrasUpload: !!irasFile,
  }));

  formData.append("personal_guarantors_json", JSON.stringify(guarantorsMeta));

  guarantors.forEach((g) => {
    if (g.icFile) {
      formData.append("pg_ic_files", g.icFile);
      formData.append("pg_ic_owners", g.name);
    }
    if (g.irasFile) {
      formData.append("pg_iras_files", g.irasFile);
      formData.append("pg_iras_owners", g.name);
    }
  });

  formData.append("pg_coverage", application.pgCoverage ?? 0);

  // Credit Bureau consent is now captured per personal guarantor (each PG
  // consents to their own CBS pull during verification). Report YES only when
  // every selected guarantor has granted it.
  const allPgCbsConsent =
    guarantors.length > 0 && guarantors.every((g) => g.cbsConsent);
  formData.append("credit_bureau_consent", allPgCbsConsent ? "YES" : "NO");

  // Bank statement is mandatory; supporting docs are optional and may be
  // uploaded later, so only append the ones that are present.
  let bankStatements = application.uploads?.bankStatements || [];

  // Bukku lane: the customer uploads nothing. Bank data is supplied by the
  // partner feed, so we attach the 6 pre-staged monthly statements served
  // from /public and let real OCR + underwriting run on them.
  if (application.lane === "BUKKU" && bankStatements.length !== 6) {
    bankStatements = await loadBukkuStatements();
  }

  if (bankStatements.length !== 6) {
    throw new Error(
      "Please upload all 6 monthly corporate bank statements."
    );
  }

  const bankStatementMetadata = bankStatements.map((statement, index) => ({
    index,
    filename: statement.filename,
    month: statement.month,
    year: statement.year,
    label: statement.periodLabel,
  }));

  bankStatements.forEach((statement) => {
    if (statement?.file) {
      formData.append("bank_statements", statement.file);
    }
  });

  formData.append(
    "bank_statement_metadata_json",
    JSON.stringify(bankStatementMetadata)
  );

  const latestStatement = [...bankStatements]
    .filter((statement) => statement?.file)
    .sort((a, b) => {
      const aMonth = Number(a.year || 0) * 12 + Number(a.month || 0);
      const bMonth = Number(b.year || 0) * 12 + Number(b.month || 0);

      return bMonth - aMonth;
    })[0];

  if (!latestStatement?.file) {
    throw new Error("No valid corporate bank statement was found.");
  }

  formData.append("bank_statement", latestStatement.file);
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

    console.error("Application submission error:", error);

    const detail = error?.detail;

    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
        ? detail.map((item) => item?.msg || JSON.stringify(item)).join(", ")
        : detail
        ? JSON.stringify(detail)
        : "Application submission failed.";

    throw new Error(message);
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

export async function getApproverApplications(decided) {
  let url = `${API_BASE}/approver/applications`;
  if (decided !== undefined) {
    url += `?decided=${decided}`;
  }
  const response = await fetch(url);

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

export async function getAiDecision(applicationId) {
  const response = await fetch(`${API_BASE}/approver/applications/${applicationId}/ai-decision`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to generate AI decision.");
  }

  return response.json();
}

export function getApplicationFileUrl(
  applicationId,
  documentType,
  fileIndex = null
) {
  const url = `${API_BASE}/approver/applications/${applicationId}/files/${documentType}`;

  return fileIndex === null || fileIndex === undefined
    ? url
    : `${url}?index=${encodeURIComponent(fileIndex)}`;
}

/**
 * URL for a personal guarantor's uploaded document (IC / IRAS NOA), addressed
 * by the guarantor's index in personal_guarantors and the document type.
 * @param {number} applicationId
 * @param {number} pgIndex
 * @param {"ic"|"iras"} documentType
 */
export function getGuarantorFileUrl(applicationId, pgIndex, documentType) {
  return `${API_BASE}/approver/applications/${applicationId}/guarantors/${pgIndex}/${documentType}`;
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

export async function deleteApplication(applicationId) {
  const response = await fetch(`${API_BASE}/approver/applications/${applicationId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to delete application.");
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
export async function lookupProperty(address) {
  const response = await fetch(
    `${API_BASE}/api/property/lookup?address=${encodeURIComponent(address)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Property lookup failed.");
  }

  return response.json();
}

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

// detect the period of a bank statement PDF by sending it to the backend for analysis.
export async function detectBankStatementPeriod(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    "http://localhost:8000/api/bank-statements/detect-period",
    {
      method: "POST",
      body: formData,
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Statement-period API error:", payload);

    const detail = payload?.detail;

    let message = "Unable to detect the bank statement period.";

    if (typeof detail === "string") {
      message = detail;
    } else if (detail?.message) {
      message = detail.message;
    } else if (detail) {
      message = JSON.stringify(detail);
    }

    throw new Error(message);
  }

  return payload;
}

const toMonthIndex = (year, month) => Number(year) * 12 + Number(month) - 1;

const getMonthLabel = (monthIndex) => {
  const date = new Date(
    Math.floor(monthIndex / 12),
    monthIndex % 12,
    1
  );

  return date.toLocaleDateString("en-SG", {
    month: "short",
    year: "numeric",
  });
};

const detectPeriods = async (filesToAdd, startingIndex) => {
  await Promise.all(
    filesToAdd.map(async (file, fileIndex) => {
      const targetIndex = startingIndex + fileIndex;

      try {
        const result = await detectBankStatementPeriod(statement.file);

        setApplication((previous) => {
          const statements = [
            ...(previous.uploads?.bankStatements || []),
          ];

          statements[targetIndex] = {
            ...statements[targetIndex],
            month: result.statement_period?.month,
            year: result.statement_period?.year,
            periodLabel:
              result.statement_period?.label ||
              "Statement period not detected",
            status: result.statement_period?.detected
              ? "detected"
              : "failed",
          };

          return {
            ...previous,
            uploads: {
              ...previous.uploads,
              bankStatements: statements,
            },
          };
        });
      } catch {
        setApplication((previous) => {
          const statements = [
            ...(previous.uploads?.bankStatements || []),
          ];

          statements[targetIndex] = {
            ...statements[targetIndex],
            periodLabel: "Unable to detect statement period",
            status: "failed",
          };

          return {
            ...previous,
            uploads: {
              ...previous.uploads,
              bankStatements: statements,
            },
          };
        });
      }
    })
  );
};

