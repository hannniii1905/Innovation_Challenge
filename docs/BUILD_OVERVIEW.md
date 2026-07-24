# UOB Credit AI — Full Build & Architecture Document

**A technical overview of the whole repository, for the tech team.**

This document describes everything in the project: the OCR/parsing pipeline, the
rule-based underwriting engine, the mocked external integrations, the database,
every API endpoint, and the full React frontend (customer journey + approver
workbench). It is written to be presented to engineers who need to understand
how the system is built and — importantly — **what is real logic vs. what is
simulated**.

---

## 0. What this system is (read this first)

This is a **working prototype of an SME loan origination and credit-decisioning
journey**. Be precise when presenting it:

- **It is mainly simulation + automation + deterministic business rules.**
- **There is no agentic AI, no LLM, and no machine-learning model anywhere.**
- The only genuinely "AI-adjacent" technology is **OCR** (optical character
  recognition) to read PDF bank statements — and even that is a standard
  library (pdfplumber / Tesseract), not a trained model of ours.
- The "AI" in "UOB Credit AI" refers to **automated, rules-based credit
  decisioning**, not artificial intelligence in the ML sense.

What *is* real: the OCR text extraction, the seven document parsers, the
transaction analysis (loan detection, fraud/kiting heuristics), the financial-
ratio math, and the deterministic decision engine. What is **simulated /
mocked**: Singpass/MyInfo, ACRA, IRAS, Experian, the Credit Bureau, keyman
email approvals, and the seeded demo portfolio.

> **Honest one-liner for the deck:** *"We built an end-to-end SME loan journey
> with real OCR-based document analysis and a deterministic rules engine for
> credit decisioning, wrapped around realistic simulations of the Singpass /
> ACRA / IRAS / Credit Bureau integrations. Agentic AI (e.g. an LLM to triage
> applications or draft credit memos) is a clear next step, but is not in this
> build."*

---

## 1. Repository layout

```
frontend/            React + Vite + MUI SPA (customer portal + approver workbench)
src/                 FastAPI backend (Python)
  api/               HTTP layer, schemas, session store, and MOCK external clients
  parsers/           Bank / IRAS / income / credit-bureau document parsers (real regex)
  mock_data/         Hardcoded demo companies, light-KYC, industry risk, property
  ocr_engine.py      Real OCR (pdfplumber + Tesseract fallback)
  underwriting_engine.py  The credit decision pipeline (rules)
  fraud_detector.py / credit_kiting.py / loan_detector.py   Transaction heuristics
  reporter.py        Report assembly
  database.py        SQLAlchemy + SQLite (single `applications` table)
  main.py            CLI entry point for the analysis pipeline
scripts/seed_demo.py Seeds a presentation-ready demo portfolio (fully synthetic)
docs/                This document + the PG-verification deep-dive
*.pdf                Mock bank statements / IRAS NOA used for demos
innovation_challenge.db   SQLite database
```

### Running locally

```bash
# Backend (repo root)
.venv/bin/python -m uvicorn src.api.app:app --host 127.0.0.1 --port 8000 --reload

# Seed a demo portfolio (optional)
.venv/bin/python -m scripts.seed_demo

# Frontend
cd frontend && npm install && npm run dev      # serves on 5173 (or next free port)

# CLI pipeline on a single PDF (no server)
.venv/bin/python -m src.main <path-to-pdf> [--output report.json] [--verbose]
```

Requires Tesseract OCR and Poppler installed at system level (see repo README)
for the OCR fallback path.

---

## 2. Two backends in one app (important context)

The codebase actually contains **two request pipelines** that grew at different
times:

1. **The OCR session pipeline** (`/api/upload → status → extraction →
   verification → approve → results`). This is the original single-document,
   human-in-the-loop OCR workflow, backed by an in-memory `SessionStore`. On the
   frontend it is only used by the legacy `App_old.jsx` (now superseded).

2. **The client application pipeline** (`/client/submit`, `/approver/...`). This
   is the current end-to-end journey backed by the SQLite `applications` table.
   This is what the live frontend (`App.jsx`) uses.

Both live in `src/api/app.py`. When presenting the *current* product, pipeline 2
is the one that matters; pipeline 1 is legacy but still functional.

---

## 3. OCR & document parsing (REAL)

### 3.1 OCR engine — `src/ocr_engine.py`
- `OCREngine.extract()` reads a PDF page-by-page. **Primary path: pdfplumber**
  (`page.extract_text()`). **Fallback: pytesseract + pdf2image** — if a page
  yields fewer than `MIN_TEXT_LENGTH = 10` characters (i.e. a scanned/image
  PDF), it rasterises at 300 DPI and runs Tesseract OCR.
- This is genuine OCR, not mocked. (Contains some leftover `DEBUG` prints.)

### 3.2 Document router — `src/document_router.py`
- `DocumentRouter` identifies the document type from the extracted text and
  returns the correct parser class.
- **IRAS NOA** is confirmed if ≥ 2 IRAS keywords appear anywhere.
- **Bank** is identified by scanning the first 1000 characters of page 1 against
  per-bank keyword sets (DBS / OCBC / Maybank / UOB). IRAS is checked first.

### 3.3 Parsers — `src/parsers/` (all REAL regex, no ML)
- `base_parser.py` — abstract `BaseBankParser` + shared dataclasses
  (`Transaction`, `LoanRepayment`, `SuspiciousCredit`).
- `dbs_parser.py`, `ocbc_parser.py`, `uob_parser.py`, `maybank_parser.py` —
  one per bank. Each finds the transaction table by a bank-specific header,
  handles multi-line descriptions, and **classifies credit vs debit by balance
  tracking** (comparing each running balance to the previous, seeded by the
  opening balance), with a keyword fallback. Amount regex: `[\d,]+\.\d{2}`;
  date regex: `DD MMM YYYY`.
- `iras_noa_parser.py` — extracts individual name, total income, year of
  assessment from an IRAS Notice of Assessment.
- `income_statement_parser.py` — regexes revenue / EBITDA / TNW / net profit.
- `credit_bureau_parser.py` — parses a CBS consumer report (score, risk grade,
  probability of default, narratives). `PASS_GRADES = {AA,BB,CC,DD,EE,FF}`.

> These parsers are written against the **format of the mock PDFs** in the repo.
> They are real parsing code, but tuned to the demo statement layouts.

---

## 4. Transaction analysis (REAL heuristics)

All three are **deterministic rule-based heuristics** over parsed transactions —
no ML.

### 4.1 Loan detector — `src/loan_detector.py`
Regex keyword matching on debit descriptions, most-specific first: `mortgage`,
`hire purchase`, `term loan`, `loan`, `instalment`, `repayment`, `financing`,
`\bHP\b` (word-boundary-guarded). Returns count, total, and matched repayments.

### 4.2 Fraud detector — `src/fraud_detector.py`
Flags credits that look like pre-loan income inflation, via four checks:
- **Round number:** exact multiple of 1000 and ≥ 5000.
- **Circular:** an offsetting debit of the same amount within 7 days.
- **Timing:** a large credit (≥ 2× median) within 5 days of period end.
- **Frequency anomaly:** a credit ≥ 3× median.

Risk score by number of triggers: `{1:0.3, 2:0.55, 3:0.8, 4:1.0}`.

### 4.3 Credit-kiting detector — `src/credit_kiting.py`
Detects intentional cash-injection patterns that inflate apparent revenue:
- **Circular** (similar debit within 5% amount tolerance, within 7 days),
- **Related-party** (matches injection keywords like "capital injection",
  "shareholder loan", "director's advance", and amount ≥ 3× median),
- **Temporary deposit** (credit near period end, withdrawn shortly after).

Risk level from a strength score: ≥3 high, ==2 medium, else low.

### 4.4 Report assembly — `src/reporter.py`
`ReportGenerator` combines parser + detector outputs into JSON-serialisable
report dicts. Pure formatting/summation, no scoring.

---

## 5. Underwriting engine (REAL rules over mixed inputs) — `src/underwriting_engine.py`

`UnderwritingEngine.execute_evaluation(application_id)` is the credit appraisal
pipeline. It:
1. Loads the `StagedApplication`.
2. Runs OCR → routing → per-bank parsing on the bank statement, then feeds
   transactions to the loan / fraud / kiting detectors (**real**).
3. Computes financial ratios (**real math**).
4. Pulls ACRA, litigation, IC, and credit-bureau inputs (**mocked** — see §6).
5. Applies a **deterministic decision rule**.

**Key formulas / thresholds:**
- `baseline_pd = 0.08`, `INTEREST_RATE = 0.0775` p.a.
- Serviceable income = annualised revenue × industry factor
  (`INDUSTRY_INCOME_FACTORS`, 0.10–0.30; default 0.15).
- Annualised revenue (no income statement) = `raw_credits / coverage_days × 365`.
- DSCR = serviceable income ÷ total debt service.
- Credit-kiting score: high +35 / medium +20 / low +10, capped at 100.

**Decision rule (deterministic):**
- **REJECT** if company in `BLACKLISTED_COMPANIES`, industry in
  `BLACKLISTED_INDUSTRIES` (Casino, Cryptocurrency, Money Lending), or bureau
  grade in `{HH, HX, HZ}`.
- **FURTHER_REVIEW** if flagged kiting volume > 0, any keyman age ≥ 70,
  litigation high-risk, or DSCR < 1.2.
- **APPROVED** otherwise.

> Note: inside this engine, `_analyse_ic`, `_perform_acra_checks`, and
> `_perform_litigation_checks` currently return **hardcoded** values (marked
> `#mock data`), and the bureau grade comes from a **random** mock client — so
> in the un-seeded live path, rejections driven by bureau grade are effectively
> random. The `seed_demo.py` portfolio bypasses this by writing coherent
> `underwriting_json` directly.

---

## 6. External integrations — ALL MOCKED

Every "external" system is simulated. None make real network calls.

| Module | Simulates | Behaviour |
|--------|-----------|-----------|
| `api/singpass_client.py` | Singpass / MyInfo Business | Returns hardcoded `COMPANY_PROFILES[profile_id]`. |
| `api/acra_client.py` | ACRA / Bizfile | Known UENs → demo profiles; unknown UENs → synthesized record. Keyman "emails" are generated from names; approval requests just log `[MOCK EMAIL]`. |
| `api/experian_client.py` | Experian corporate bureau | Deterministic lookup of a profile's grade / litigation / charges by UEN. |
| `api/credit_bureau_client.py` | Consumer Credit Bureau (CBS) | **Returns a RANDOM grade each call**, ignoring the applicant. Drives the reject rule. |
| `mock_data/company_profiles.py` | The demo companies | 3 hardcoded scenarios: Nexus (AA→approve), Vortex (CC/litigation→review), Orion (HX→reject). |
| `mock_data/light_kyc.py` | AML / CIF / industry / exposure screening | Hardcoded hit tables keyed by UEN + substring industry match. |
| `mock_data/industry_risks.py` | Industry risk narrative | Templated text assembled with a **seeded RNG** (deterministic per industry) — looks generative, is not ML. |
| `mock_data/property_data.py` | Land/property registry | Address → coordinates, owner, tenure, type (used by the site-visit map). |

---

## 7. Database — `src/database.py`

- **SQLite** at `sqlite:///./innovation_challenge.db`, via SQLAlchemy.
- Single table **`applications`** (model `StagedApplication`). Column groups:
  identity (`uen`, `company_name`, `singpass_profile_json`), questionnaire
  (`requested_quantum`, `declared_loans`, `pre_questionnaire_json`), document
  paths (`bank_statement_paths` JSON list, `income_statement_path`,
  `financials_path`, `ic_path`), loan config, declarations, consent
  (`credit_bureau_consent`), OCR outputs (`bank_ocr_json`, …), third-party JSON
  (`acra_json`, `litigation_json`, `credit_bureau_json`), derived metrics
  (`annualised_revenue`, `dscr`, `mue`, …), system decision (`system_decision`,
  `risk_flags`, `credit_score`), approver fields, and personal-guarantee fields
  (`personal_guarantors_json`, `pg_coverage`, `underwriting_json`).
- A custom `SQLiteJSON` type stores dict/list as JSON text. `_ensure_columns()`
  is a lightweight idempotent migration (adds missing columns; migrated the
  legacy single `bank_statement_path` into the `bank_statement_paths` list).
- A separate **in-memory `SessionStore`** (`api/session_store.py`) backs the
  legacy OCR session pipeline only.

---

## 8. HTTP API — `src/api/app.py` (FastAPI)

### Current client + approver pipeline
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/client/submit` | Submit a full application (requires **6 monthly bank statements**, optional income/IC/financials, per-guarantor IC/IRAS). Creates a `StagedApplication` and runs underwriting. |
| POST | `/api/bank-statements/detect-period` | Detect the month/year a bank statement covers (drives the 6-statement uploader). |
| GET | `/client/applications/{id}/documents` | What's on file vs. outstanding. |
| POST | `/client/applications/{id}/documents` | Upload supporting docs later. |
| GET | `/approver/applications` | Approver queue, categorised; `?decided=` filter. |
| GET | `/approver/applications/{id}` | Full application detail. |
| GET | `/approver/applications/{id}/files/{type}` | Serve a stored file (bank statement by `index`, income, IC, financials). |
| GET | `/approver/applications/{id}/guarantors/{pg_index}/{ic\|iras}` | Serve a PG's uploaded document. |
| POST | `/approver/applications/{id}/decision` | Record decision + amount + notes. |
| DELETE | `/approver/applications/{id}` | Delete application + files. |
| GET | `/api/acra/company?uen=` | Mock ACRA lookup. |
| POST | `/api/keyman/request-approval` | Mock keyman email notification. |
| GET | `/api/property/lookup?address=` | Mock property registry lookup. |

### Legacy OCR session pipeline (used only by `App_old.jsx`)
`POST /api/upload`, `GET /api/sessions/{id}/status`, `GET …/extraction`,
`PUT …/verification`, `POST …/approve`, `GET …/results`.

---

## 9. Frontend — `frontend/`

### Stack
- **React 18 + Vite 7**, UI built almost entirely on **MUI v9** (theme in
  `src/theme.js` with the UOB brand palette; applied in `main.jsx`). Tailwind is
  a configured dependency but barely used — styling is MUI `sx` + theme.
- **Leaflet / react-leaflet** for the property map; **react-qr-code** for the
  Singpass-style QR mock.
- **No router** — `App.jsx` is a `switch` on a `screen` string, threading one
  shared `application` object through every screen.

### State machine (`App.jsx`)
`profile → loanLandingPage → singpass → (myInfoReview | uenLookup) →
pgVerification → application → initialAssessment → supportingDocs`, plus the
approver branch `creditApprover → creditDecision → {tampering | litigation |
riskFlag} details` and `creditHistory`.

### Page inventory
**Customer journey:** `DemoProfileSelector`, `LoanLandingPage`, `SingpassLogin`,
`UenLookup`, `MyInfoReview`, `PgVerification`, `LoanApplication`,
`InitialAssessment`, `SupportingDocuments`.

**Approver / bank side:** `CreditApproverDashboard`, `CreditApproverHistory`,
`CreditDecisionWorkbench`, `TamperingDetailsPage`, `LitigationDetailsPage`,
`RiskFlagDetailsPage`.

**Shared components:** `PortalShell` (layout), `PropertyMapCard` (site-visit
map), `LightKycPanel` (screening results).

**Application-form sub-components** (`components/application/`):
`CompanyInformation`, `LoanCalculator`, `AdditionalDeclarations`,
`DocumentUploader`, `ConsentSection`, `PgSelection` (`usePgSelection` hook +
`PgSelectionCard`, shared by MyInfoReview and UenLookup).

**Support libs:** `lib/format.js` (stage labels, currency), `lib/pg.js` (PG age
math, demo IRAS income, `PG_MAX_AGE_AT_MATURITY = 70`), `api/client.js`
(all backend calls).

### API client (`src/api/client.js`)
Wraps the backend calls: `submitApplication` (builds the big multipart form,
enforces 6 bank statements), `getApproverApplications`, `getApproverApplication`,
`submitApproverDecision`, `deleteApplication`, `getApplicationFileUrl`,
`getGuarantorFileUrl`, `acraLookup`, `requestKeymanApproval`, `lookupProperty`,
`detectBankStatementPeriod`, plus the legacy OCR-session functions.

---

## 10. Personal Guarantor verification (this iteration's headline work)

The PG redesign has its own deep-dive in **`docs/PG_VERIFICATION_BUILD.md`**.
In summary:
- Company data (login) is separated from personal data (per-PG verification).
- PG selection: ≥25% shareholders mandatory, ranked to ≥50% coverage; shared
  hook/component across the Singpass and ACRA paths.
- Each PG verifies individually — Singpass directly if they're the applicant,
  else an emailed remote link. CBS consent is a separate explicit step.
- A PG's PII (DOB, IRAS income) is hidden from others in the portal but flows to
  the approver, who can also open each PG's IC/IRAS documents.

---

## 11. Known limitations, dead code & cleanup notes

**Simulation shortcuts (by design for the demo):**
- Singpass, ACRA, IRAS, Experian, CBS are all mocked; keyman emails are logged,
  not sent; remote PG verification is a demo button.
- `credit_bureau_client.py` returns a **random** grade — non-deterministic
  rejections in the un-seeded live path.
- `main.py` injects hardcoded "4-zone" underwriting values (PD 8/38, caps).

**Dead / orphaned frontend files** (no importers — candidates for removal):
`App_old.jsx` (legacy root), `VerificationTable.jsx`, `KitingFindings.jsx`
(only used by `App_old`), `WorkflowStepper.jsx`, `ResultsDashboard.jsx`,
`UploadPanel.jsx`, `ClientPortal.jsx`, `ApplicationSubmitted.jsx`,
`Evaluating.jsx`, `KeymanApproval.jsx`.

**Code hygiene worth flagging:**
- `client.js` mixes three backend base URLs (`/api` proxied,
  `http://127.0.0.1:8000`, `http://localhost:8000`) — should be unified via an
  env var before deployment (CORS risk).
- `client.js` has a trailing `detectPeriods` helper referencing undefined
  identifiers — dead/broken paste, never called.
- Leftover `DEBUG`/`print` statements in `ocr_engine.py`, `document_router.py`,
  and `client.js`.

---

## 12. Where AI / agentic AI could go next (roadmap, not built)

To make the "AI" label real, natural next steps:
- **LLM application triage & summarisation** — an agent that reads the parsed
  statements + KYC results and drafts a credit memo / evidence summary for the
  approver.
- **ML credit scoring** — replace the deterministic PD/DSCR rules and the random
  bureau mock with a trained default-probability model.
- **Agentic document intake** — an agent that classifies, validates, and
  chases missing documents, and reconciles OCR anomalies (tampering) instead of
  the current fixed heuristics.
- **Real integrations** — swap the mock Singpass/ACRA/IRAS/CBS clients for the
  actual APIs behind the same interfaces (the code is already structured as
  client classes, which makes this a clean substitution).
```
