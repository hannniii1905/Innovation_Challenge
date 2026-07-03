import { useCallback, useRef, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const SAMPLE_FILES = [
  "mock_dbs_sme_statement.pdf",
  "mock_ocbc_sme_statement.pdf",
  "mock_uob_sme_statement.pdf",
  "mock_maybank_sme_statement.pdf",
  "mock_iras_noa_individual.pdf",
];

/**
 * Drag-and-drop PDF upload with client-side validation and feedback.
 *
 * Props:
 *   onUpload(file)  -> called with a validated File
 *   busy            -> when true the panel is disabled (upload in flight)
 *   error           -> server-side error string to surface
 */
export default function UploadPanel({ onUpload, busy = false, error = null }) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  const validate = useCallback((file) => {
    if (!file) return "No file selected.";
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return "Only PDF files are accepted.";
    if (file.size === 0) return "That file appears to be empty.";
    if (file.size > MAX_BYTES) return "File exceeds the 10 MB limit.";
    return null;
  }, []);

  const accept = useCallback(
    (file) => {
      const validationError = validate(file);
      if (validationError) {
        setLocalError(validationError);
        setFileName(null);
        return;
      }
      setLocalError(null);
      setFileName(file.name);
      onUpload(file);
    },
    [validate, onUpload]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      setDragging(false);
      if (busy) return;
      const file = event.dataTransfer?.files?.[0];
      accept(file);
    },
    [accept, busy]
  );

  const onSelect = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      accept(file);
      // Allow re-selecting the same file.
      event.target.value = "";
    },
    [accept]
  );

  const message = error || localError;

  return (
    <section className="card p-8 animate-fade-in-up">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">
          Upload a financial statement
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Bank statements (DBS, OCBC, UOB, Maybank) or an IRAS Notice of
          Assessment.
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          "group relative flex w-full flex-col items-center justify-center",
          "rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200",
          dragging
            ? "border-brand-500 bg-brand-50 scale-[1.01]"
            : "border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-brand-50/50",
          busy ? "cursor-wait opacity-70" : "cursor-pointer",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onSelect}
          disabled={busy}
        />

        <span
          className={[
            "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft transition-transform",
            dragging ? "scale-110" : "group-hover:scale-105",
            busy ? "animate-pulse-ring" : "",
          ].join(" ")}
        >
          {busy ? (
            <svg
              className="h-7 w-7 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
              />
            </svg>
          ) : (
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          )}
        </span>

        <span className="text-base font-semibold text-slate-800">
          {busy
            ? "Uploading…"
            : dragging
              ? "Drop to upload"
              : "Drag & drop your PDF here"}
        </span>
        <span className="mt-1 text-sm text-slate-500">
          or <span className="font-medium text-brand-600">browse files</span> ·
          PDF only · max 10 MB
        </span>

        {fileName && !message && (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z"
                clipRule="evenodd"
              />
            </svg>
            {fileName}
          </span>
        )}
      </button>

      {message && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in-up">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
              clipRule="evenodd"
            />
          </svg>
          <span>{message}</span>
        </div>
      )}

      <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-medium text-slate-500">
          Sample files in the project root you can try:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAMPLE_FILES.map((name) => (
            <span
              key={name}
              className="rounded-md bg-white px-2 py-1 font-mono text-[11px] text-slate-500 shadow-sm ring-1 ring-slate-200"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
