# Financial Statement Analyzer — Frontend

A polished React + Tailwind UI for the OCR Financial Statement Analyzer. It
drives the human-in-the-loop pipeline: upload → extraction → verification →
analysis → results.

## Running it

1. Start the backend (from the project root) so the API is available on
   `http://localhost:8000`:

   ```bash
   uvicorn src.api.app:app --reload
   ```

2. Start the frontend dev server:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Open the printed URL (default `http://localhost:5173`). The Vite dev server
   proxies `/api/*` to the backend, so no extra configuration is needed.

## Scripts

- `npm run dev` — start the dev server with hot reload
- `npm run build` — production build into `dist/`
- `npm run preview` — preview the production build locally

## What you can try

Upload one of the sample PDFs in the project root (e.g.
`mock_dbs_sme_statement.pdf` or `mock_iras_noa_individual.pdf`), correct any
extracted fields in the verification step, then approve to see the results
dashboard and credit-kiting findings.
