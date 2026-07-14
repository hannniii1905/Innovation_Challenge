# OCR Financial Statement Analyzer

A Python-based OCR tool that extracts and analyzes key financial data from PDF bank statements and IRAS Notice of Assessment (NOA) documents. Designed to support credit analysts in evaluating business cash flow, identifying debt obligations, and detecting potentially fraudulent transactions.

## Features

- **Multi-bank support**: Parses statements from DBS, OCBC, Maybank, and UOB
- **IRAS NOA support**: Extracts individual taxpayer information from IRAS Notice of Assessment documents
- **Company name extraction**: Identifies the account holder's business name from statement headers
- **Credit/Debit totals**: Calculates total credits and debits across all transactions
- **Loan repayment detection**: Identifies loan repayment transactions in debits (e.g., instalment, mortgage, financing)
- **Suspicious credit detection**: Flags credits that may be designed to artificially inflate income for loan applications (round-number transfers, circular transactions, timing anomalies)
- **IRAS data extraction**: Extracts individual name and total income from NOA documents
- **Structured JSON output**: Produces machine-readable reports for downstream processing

## Installation

### System Dependencies

This project requires the following system-level tools to be installed:

**Tesseract OCR** (for scanned/image-based PDFs):

```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Windows
# Download installer from https://github.com/tesseract-ocr/tesseract
```

**Poppler** (for PDF-to-image conversion):

```bash
# macOS
brew install poppler

# Ubuntu/Debian
sudo apt-get install poppler-utils

# Windows
# Download from https://github.com/osber/poppler-windows/releases
```

### Python Dependencies

Requires Python 3.10 or higher.

```bash
pip install -r requirements.txt
```

This installs:
- `pdfplumber` — Primary PDF text extraction
- `pytesseract` — OCR fallback for scanned documents
- `Pillow` — Image processing for OCR
- `pdf2image` — PDF to image conversion (uses poppler)

## Usage

### Basic Usage

Run the analyzer on a PDF file:

```bash
python -m src.main path/to/statement.pdf
```

### Examples

Analyze a DBS bank statement:

```bash
python -m src.main mock_dbs_sme_statement_v2.pdf
```

Analyze an IRAS Notice of Assessment:

```bash
python -m src.main mock_iras_noa_individual.pdf
```

Save output to a file:

```bash
python -m src.main mock_ocbc_sme_statement.pdf --output report.json
```

Enable verbose logging:

```bash
python -m src.main mock_maybank_sme_statement.pdf --verbose
```

## Running the Web App

The project ships with a FastAPI backend and a React + Tailwind frontend that
drive the human-in-the-loop workflow.

### Backend (FastAPI)

From the project root, start the API on port `8000`:

```bash
uvicorn src.api.app:app --reload
```

The interactive API docs are then available at `http://localhost:8000/docs`.

### Frontend (React + Vite)

In a separate terminal, install dependencies and start the dev server on port
`5173`:

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). The Vite dev server
proxies `/api/*` requests to the backend on port `8000`, so no extra
configuration is needed as long as both are running.

### AI Decision Generation (Hugging Face LLM)

The **Final Assessment Summary** panel in the Credit Decision Workbench uses a
free Hugging Face LLM (Qwen 2.5 7B) to generate an AI-powered credit decision
with rationale. This provides a second opinion alongside the automated underwriting
engine.

**How it works:**
- When a Credit Approver opens an application, the workbench automatically
  calls the LLM with all available data (financials, credit bureau, risk flags,
  kiting score, guarantors, etc.)
- The LLM returns a decision (APPROVED / REJECTED / SUBJECT TO APPROVAL),
  a detailed rationale, and key factors
- The result is displayed in the "Final Assessment Summary" panel with a
  color-coded decision chip and "Powered by AI" label
- Without the token, the system falls back to the original system reason
  (no errors, no crashes)

**Setup (free, no billing required):**

1. Create a free account at [huggingface.co](https://huggingface.co/join)
2. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. Click **"New token"**, select **"Read"** role, and generate
4. Export the token before starting the backend:

```bash
export HF_TOKEN="hf_your_token_here"
uvicorn src.api.app:app --reload
```

**To make it persistent**, add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
echo 'export HF_TOKEN="hf_your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

**Free tier limits:** 30 requests/day, ~5-10 second response time per analysis.

## API Endpoints

All endpoints are served under the `/api` prefix. A session is created on
upload and tracked through the workflow stages
(`uploaded → extracting → awaiting_verification → analyzing → completed`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Accept a PDF (validates type/size), create a session, run extraction, and set the stage to `awaiting_verification`. Returns the `session_id` and identified `document_type`. |
| `GET` | `/api/sessions/{id}/status` | Return the current workflow `stage`, `document_type`, `approved` flag, and any `error`. Used by the frontend stepper to poll progress. |
| `GET` | `/api/sessions/{id}/extraction` | Return the extracted fields and transactions (with recalculated totals) for human review. |
| `PUT` | `/api/sessions/{id}/verification` | Store reviewer corrections and recalculate totals **without** finalizing. Tracks which fields were human-corrected. |
| `POST` | `/api/sessions/{id}/approve` | Mark the data verified, run downstream analysis (loan / fraud / credit-kiting), and set the stage to `completed`. |
| `GET` | `/api/sessions/{id}/results` | Return the final report, including credit-kiting findings and sales recommendations. Returns `409` if called before approval. |

## Human-in-the-Loop Verification Flow

The web app enforces a verification gate so that no analysis is reported until a
human has reviewed and approved the extracted data:

1. **Upload** — The analyst uploads a PDF bank statement or IRAS NOA. The
   backend validates the file, creates a session, and begins extraction.
2. **Extraction** — OCR + the document router identify the document type and the
   appropriate parser extracts fields and transactions. The session moves to
   `awaiting_verification`.
3. **Human Verification** — The analyst reviews the extracted fields and
   transactions in an editable table. Edits are submitted via the verification
   endpoint, which recalculates totals on the fly and visually marks any
   human-corrected fields. The data is **not** finalized at this point.
4. **Approval** — The analyst explicitly approves the verified data. Only after
   this Approval step does the backend run the downstream analysis:
   loan-repayment detection, suspicious-credit (fraud) analysis, and
   credit-kiting detection.
5. **Results** — The final report is returned, including totals, loan
   repayments, suspicious credits, and credit-kiting findings (ordered by risk
   level) with their sales recommendations and triggering transactions.

Because the loan, fraud, and credit-kiting analyses run **only after approval**,
the analyst's corrections always feed the final report — satisfying the
human-in-the-loop requirement.

## Output Format

The tool outputs structured JSON reports. The format depends on the document type.

### Bank Statement Report

```json
{
  "document_type": "bank_statement",
  "bank": "DBS",
  "company_name": "ABC Pte Ltd",
  "statement_period": "01 Jan 2024 - 31 Jan 2024",
  "total_credits": 150000.00,
  "total_debits": 120000.00,
  "loan_repayments": {
    "count": 2,
    "total_amount": 5000.00,
    "transactions": [...]
  },
  "suspicious_credits": {
    "count": 1,
    "transactions": [
      {
        "date": "2024-01-28",
        "amount": 50000.00,
        "risk_score": 0.8,
        "reason": "Round number transfer near statement end"
      }
    ]
  },
  "warnings": []
}
```

### IRAS NOA Report

```json
{
  "document_type": "iras_noa",
  "individual_name": "John Tan",
  "year_of_assessment": "2024",
  "total_income": 120000.00,
  "warnings": []
}
```

## Supported Documents

| Document Type | Source | What's Extracted |
|---------------|--------|------------------|
| Bank Statement | DBS | Company name, credits/debits, loan repayments, suspicious credits |
| Bank Statement | OCBC | Company name, credits/debits, loan repayments, suspicious credits |
| Bank Statement | Maybank | Company name, credits/debits, loan repayments, suspicious credits |
| Bank Statement | UOB | Company name, credits/debits, loan repayments, suspicious credits |
| Notice of Assessment | IRAS | Individual name, total income, year of assessment |

## Project Structure

```
Innovation_Challenge/
├── src/
│   ├── __init__.py
│   ├── main.py              # CLI entry point
│   ├── ocr_engine.py        # PDF text extraction
│   ├── document_router.py   # Document type identification and routing
│   ├── credit_kiting.py     # Credit-kiting detection + recommendations
│   ├── underwriting_engine.py# Underwriting score calculations
│   ├── mock_data/
│   │   └── industry_risks.py# Industry analysis (HuggingFace LLM + fallback templates)
│   ├── api/
│   │   ├── __init__.py
│   │   ├── app.py           # FastAPI app + endpoints
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── credit_bureau_client.py # Mock CBS API
│   │   └── session_store.py # In-memory session store
│   ├── parsers/
│   │   ├── __init__.py
│   │   ├── base_parser.py   # Abstract base parser class
│   │   ├── dbs_parser.py    # DBS statement parser
│   │   ├── ocbc_parser.py   # OCBC statement parser
│   │   ├── maybank_parser.py# Maybank statement parser
│   │   ├── uob_parser.py   # UOB statement parser
│   │   ├── iras_noa_parser.py # IRAS NOA parser
│   │   └── credit_bureau_parser.py # CBS PDF report parser
│   ├── loan_detector.py     # Loan repayment detection
│   ├── fraud_detector.py    # Suspicious credit detection
│   └── reporter.py          # JSON report generation
├── frontend/                # React + Tailwind web UI (Vite)
│   ├── src/
│   │   ├── api/client.js     # Backend API client
│   │   └── components/       # Upload, stepper, verification, results UI
│   └── package.json
├── tests/
│   └── __init__.py
├── requirements.txt
└── README.md
```

## License

This project is for internal use as part of the Innovation Challenge.
