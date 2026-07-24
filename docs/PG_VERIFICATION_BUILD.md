# UOB Credit AI — Personal Guarantor Verification & Customer Journey

**A build & design document for the tech team**

This document explains how the customer-facing loan journey works, with a focus
on the **personal guarantor (PG) verification** redesign — the core piece of
work in this iteration. It covers the data model, the page-by-page flow (both
Singpass and ACRA paths), the frontend/backend contract, and the design
decisions behind each part.

---

## 1. High-level architecture

```
frontend/  React + Vite + MUI single-page app (the customer portal + approver workbench)
src/       FastAPI backend (Python) — application intake, OCR/underwriting, approver APIs
           SQLite DB (innovation_challenge.db) via SQLAlchemy (StagedApplication model)
```

- The frontend talks to the backend over HTTP. In dev, Vite proxies `/api/*`
  to `http://localhost:8000`; some newer endpoints call the backend at
  `http://127.0.0.1:8000` directly (see `frontend/src/api/client.js`).
- There is **no client-side router**; the app is a state machine in
  `frontend/src/App.jsx` — a `screen` string selects which page renders, and a
  single `application` object holds all journey state.

### Running locally

```bash
# Backend (from repo root)
.venv/bin/python -m uvicorn src.api.app:app --host 127.0.0.1 --port 8000 --reload

# Frontend
cd frontend && npm install && npm run dev      # serves on 5173 (or next free port)
```

---

## 2. The core problem we solved

**Before:** a single Singpass login by the applicant magically exposed *every*
keyman's personal data (date of birth, NRIC, etc.), and the app showed PG
"age eligibility" for everyone up front. That is not how it works in reality —
you cannot pull a person's personal data, IRAS income, or credit-bureau report
unless **that person** authenticates and consents.

**After:** we cleanly separated **company data** from **personal data**:

| Data | Who provides it | When |
|------|-----------------|------|
| Company profile (MyInfo Business / ACRA) | The applicant, at login | Login step |
| PG identity (DOB), IRAS NOA income, CBS credit report | **Each PG individually** | PG Verification step |

The applicant is **not necessarily** a personal guarantor. Being the applicant
and being a PG are independent — the flow reflects that.

---

## 3. Journey state model (`App.jsx`)

`App.jsx` holds one `application` object and a `screen` string. Key fields:

```js
application = {
  profile,            // company profile (from demo selector / ACRA lookup)
  authMethod,         // "SINGPASS_MYINFO" | "UEN_ACRA"
  applicant,          // { name, email, isKeyman }
  loanAmount, tenure, interestRate, monthlyInstallment,
  declarations,       // Section A/B questionnaire answers
  uploads,            // company-level documents (bank statements, financials)
  personalGuarantors, // [] — see the PG record shape below
  pgCoverage,         // total shareholding % of selected PGs
  consent,            // { screening, declaration, singpassSigned, ... }
  ...
}
```

### Personal guarantor record shape

Each entry in `personalGuarantors` (set when PGs are selected, enriched during
verification):

```js
{
  name, role, shareholding, nric,
  dob,          // null until verified (from Singpass, or OCR'd from IC)
  age,          // derived from dob
  verified,     // false until the PG completes verification
  method,       // "SINGPASS" | "SINGPASS_REMOTE" | "MANUAL" | null
  cbsConsent,   // false until the PG explicitly consents to a CBS pull
  irasIncome,   // null unless retrieved / uploaded
  icFile, irasFile,  // browser File objects for the manual path (frontend only)
}
```

---

## 4. The customer journey, page by page

There are **two entry paths** that converge on the same PG Verification and
application steps.

### 4a. Singpass path (has Singpass/Corppass)

```
Profile select → Loan Landing → Singpass Login → MyInfo Review
              → PG Verification → Loan Application → Assessment
```

**Singpass Login (`SingpassLogin.jsx`)**
- Retrieves **company (MyInfo Business) data only**. We removed the old
  "who is applying — director vs non-director" question and the personal
  (MyInfo Person) items from the consent screen; the consent screen now lists
  only business data with a note that no personal data is retrieved here.
- Records the applicant (top keyman by shareholding, by full name) so the PG
  step can tell whether the applicant is themselves a selected PG.

**MyInfo Review (`MyInfoReview.jsx`)**
- Shows company profile + an **Applicant** card trimmed to **name + role only**
  (no PII, since login didn't pull personal data).
- Hosts **PG selection** (shared component — see §5). Default selection is the
  *minimal* set: all mandatory shareholders (≥25%), then the next-highest
  shareholders until combined shareholding reaches ≥50% coverage.
- Site-visit property card (see §7).

### 4b. ACRA path (no Singpass — e.g. foreign director)

```
Singpass Login → "ACRA Search" → UEN Lookup (search + PG selection)
              → PG Verification (all PGs emailed) → Loan Application → Assessment
```

**UEN Lookup (`UenLookup.jsx`)**
- Looks up the company by UEN from the mock ACRA registry.
- **PG selection now lives on this results page** (same shared component as
  MyInfo Review). We removed the intermediate "Here's what we retrieved" page
  and the separate keyman-approval page for this path.
- Because the ACRA applicant is not a verifiable keyman, *every* selected PG
  receives an email invite on the next step.

### 4c. PG Verification (`PgVerification.jsx`) — the heart of the redesign

Each selected PG must complete verification. The action offered depends on
whether the PG **is the applicant**:

- **PG is the applicant** → they can **verify with Singpass directly now**
  (reuses the QR-scan modal). This pulls DOB and IRAS income.
  - If they have no Singpass → **manual path**: upload IC (DOB is OCR-extracted
    from the IC — no manual entry), IRAS NOA is **optional**, plus CBS consent.
- **PG is not the applicant** → **"Send verification link"** emails that keyman
  a secure link to complete verification remotely on their own device. The row
  shows an "Invite sent — awaiting completion" state. (A demo "Simulate remote
  completion" button unblocks the flow.)

**CBS (Credit Bureau) consent is a separate, explicit step** — logging in does
NOT grant it. After identity is verified, the PG must tick a distinct CBS
consent checkbox. "Continue" is gated until **every** PG is both
`verified` **and** has `cbsConsent`.

**Privacy:** a PG's DOB and IRAS income are **not shown to other people** in the
customer portal. The portal only shows compliance status (age-eligibility chip,
CBS consent status). The applicant sees only their own details. The raw values
still flow to the backend for the approver, who is authorised to see them.

### 4d. Loan Application (`LoanApplication.jsx`)

Four steps: **Loan Details → Questionnaire → Documents → Consent**.
- **Loan Details:** amount/tenure/indicative instalment. (Loan-purpose
  selection was removed — customers didn't know what to pick.)
- **Questionnaire (`AdditionalDeclarations.jsx`):** Section A (financials) and
  Section B (sanctions). Section B's detailed questions are **gated** behind a
  single screening question — they only appear if the customer confirms
  dealings with the sanctioned countries/regions.
- **Documents (`DocumentUploader.jsx`):** corporate bank statements
  (mandatory) + optional company financials. The per-person IC/IRAS boxes were
  removed here because those are now collected per-PG during verification.
- **Consent (`ConsentSection.jsx`):** company-level screening + accuracy
  declaration + a Singpass digital signature to submit. We removed the
  company-level Credit Bureau consent (now per-PG) and the ACRA consent
  (ACRA data doesn't require consent).

---

## 5. Shared PG selection logic

To avoid two divergent copies (Singpass path and ACRA path), the selection
logic lives in **`frontend/src/components/application/PgSelection.jsx`**:

- `usePgSelection(keymen)` — a hook that ranks keymen by shareholding, marks
  those ≥25% as mandatory (cannot be deselected), and defaults to the minimal
  set reaching `PG_MIN_COVERAGE` (50%). Exposes `coverage`, `meetsCoverage`,
  and `buildGuarantors()` (produces the unverified PG records).
- `PgSelectionCard` — the keymen table + coverage meter UI.

Shared helpers (age math, demo IRAS income, currency formatting, the
`PG_MAX_AGE_AT_MATURITY = 70` threshold) live in
**`frontend/src/lib/pg.js`**.

> **Policy note:** the "age at maturity ≤ 70" rule is a **bank internal credit
> policy**, not a MAS regulation. MAS age-at-maturity rules (65/75) apply to
> residential property loans under LTV/TDSR, not SME loans or guarantors. The
> customer-facing guideline text was removed; the eligibility chip (an internal
> policy signal) remains.

---

## 6. Backend contract

### Application submission — `POST /client/submit` (`src/api/app.py`)

The frontend (`client.js → submitApplication`) sends multipart form data:

- Company fields (UEN, name, industry, quantum, tenure, etc.)
- `personal_guarantors_json` — the PG metadata (File objects stripped out first,
  since they don't serialize to JSON).
- **Per-PG manual documents** — uploaded as parallel arrays so the backend can
  map file → guarantor:
  - `pg_ic_files` / `pg_ic_owners`
  - `pg_iras_files` / `pg_iras_owners`
- `credit_bureau_consent` — "YES" only when **all** PGs granted CBS consent.

Backend handling (endpoint parameters use `Optional[List[UploadFile]] =
File(None)` — an important FastAPI detail: a `[]` default does not parse
repeated multipart fields). Each PG's IC/IRAS is saved into a
`uploaded_applications/application_<id>/guarantors/` subfolder, and the saved
path is written back onto that guarantor's entry in
`personal_guarantors_json` (via a deep-copy + reassignment so SQLAlchemy
detects the JSON mutation).

### Serving PG documents to the approver

```
GET /approver/applications/{id}/guarantors/{pg_index}/{ic|iras}
```

Reads the `ic_path` / `iras_path` from the guarantor entry and streams the
file. Frontend helper: `getGuarantorFileUrl(applicationId, pgIndex, type)`.

---

## 7. Site-visit property card (`PropertyMapCard.jsx`)

Reframed from a plain map into a **"Site Visit — Location Verification"** view:
- **Street View / Satellite toggle** (defaults to Street View via a keyless
  Google embed) so the reviewer sees the actual building frontage and signage.
- **Site-visit observations** derived from the property type (signage present,
  operating status, occupancy) with pass/warn indicators — residential
  addresses flag a warning (home-based / verify operating premises).
- **Registry facts** (building, type, owner, land tenure) from the mock
  property registry (`src/mock_data/property_data.py`).

Demo data was aligned so the software company (NEXUS INNOVATION) is registered
at **1 Fusionopolis Way, Connexis** (a real one-north tech tower) — the address
and Street View coordinates now match the company's industry.

---

## 8. Approver side (`CreditDecisionWorkbench.jsx`, `RiskFlagDetailsPage.jsx`)

The approver **is** authorised to see PG personal data. The PG tables now
surface the new fields collected during verification:
- Verification status + method (Singpass / remote / manual)
- Age + age-eligibility (`<70` / `≥70`)
- IRAS NOA income
- CBS consent status
- Per-PG IC/IRAS document links (open in a new tab)

A subtle correctness fix: a PG with an unknown age (unverified) is treated as
**"pending"**, not silently as "under 70". Rollup lines summarise whether all
PGs are verified and all CBS consent is granted.

---

## 9. Files touched (reference)

**New**
- `frontend/src/pages/PgVerification.jsx` — per-PG verification page
- `frontend/src/components/application/PgSelection.jsx` — shared selection hook + card
- `frontend/src/lib/pg.js` — shared PG helpers

**Frontend (modified)**
- `App.jsx` — routing/state for the new step and the two paths
- `pages/SingpassLogin.jsx` — company-only login, removed director/non-director choice
- `pages/MyInfoReview.jsx` — applicant card trimmed, uses shared PG selection
- `pages/UenLookup.jsx` — PG selection on ACRA results, routes to PG Verification
- `components/application/ConsentSection.jsx` — removed CBS + ACRA consent, fixed signer
- `components/application/DocumentUploader.jsx` — removed per-person IC/IRAS boxes
- `components/application/AdditionalDeclarations.jsx` — gated Section B
- `components/application/LoanCalculator.jsx` — removed loan-purpose selection
- `components/PropertyMapCard.jsx` — site-visit Street View
- `components/LightKycPanel.jsx`, `pages/Evaluating.jsx` — copy fixes
- `pages/CreditDecisionWorkbench.jsx`, `pages/RiskFlagDetailsPage.jsx` — approver PG view
- `pages/SupportingDocuments.jsx`, `api/client.js` — supporting docs / submit contract

**Backend (modified)**
- `src/api/app.py` — per-PG file params on `/client/submit`, guarantor-file route
- `src/mock_data/property_data.py` — Fusionopolis address for the software company

---

## 10. Known limitations / demo shortcuts

- **Email invites are simulated** — the "Send verification link" and remote
  completion are frontend-only; no email is actually sent, and a demo button
  simulates the PG completing remotely.
- **Singpass / IRAS / CBS are mocked** — DOB and IRAS income come from demo
  data; there is no real Singpass, IRAS, or Credit Bureau integration.
- **Street View coverage** — the keyless Google embed can vary; the Satellite
  toggle is a reliable fallback.
- **The "age ≤ 70" threshold** is bank policy, not MAS regulation (see §5).
```
