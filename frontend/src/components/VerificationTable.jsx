import { useMemo, useState } from "react";
import { formatCurrency, humanizeDocType, IRAS_NOA } from "../lib/format";

/**
 * Editable verification view for the extracted data. Supports both bank
 * statements (company name, statement period, transactions) and IRAS NOA
 * documents (individual name, total income, year of assessment).
 *
 * Totals are recalculated live from the in-progress edits. Fields the human
 * changes are visually highlighted (amber). On approval the diff of changed
 * fields is sent up via onApprove(corrections).
 *
 * Props:
 *   extraction          -> ExtractionResponse from the backend
 *   onApprove(corrections, hasChanges) -> finalize: persist corrections + analyze
 *   busy                -> disables inputs / button while a request is in flight
 *   error               -> server-side error string
 */
export default function VerificationTable({
  extraction,
  onApprove,
  onBack,
  busy = false,
  error = null,
}) {
  const isIras = extraction.document_type === IRAS_NOA;

  // ---- Bank statement editable state -------------------------------------
  const [companyName, setCompanyName] = useState(
    extraction.company_name ?? ""
  );
  const [statementPeriod, setStatementPeriod] = useState(
    extraction.statement_period ?? ""
  );
  const [transactions, setTransactions] = useState(() =>
    (extraction.transactions ?? []).map((t) => ({ ...t }))
  );

  // ---- IRAS editable state -----------------------------------------------
  const [individualName, setIndividualName] = useState(
    extraction.individual_name ?? ""
  );
  const [totalIncome, setTotalIncome] = useState(
    extraction.total_income ?? 0
  );
  const [yearOfAssessment, setYearOfAssessment] = useState(
    extraction.year_of_assessment ?? ""
  );

  // ---- Change tracking ----------------------------------------------------
  const companyChanged = companyName !== (extraction.company_name ?? "");
  const periodChanged =
    statementPeriod !== (extraction.statement_period ?? "");
  const nameChanged = individualName !== (extraction.individual_name ?? "");
  const incomeChanged =
    Number(totalIncome) !== Number(extraction.total_income ?? 0);
  const yearChanged =
    yearOfAssessment !== (extraction.year_of_assessment ?? "");

  // ---- Live totals --------------------------------------------------------
  const { totalCredits, totalDebits } = useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const t of transactions) {
      const amount = Number(t.amount) || 0;
      if ((t.transaction_type || "").toLowerCase() === "credit") {
        credits += amount;
      } else if ((t.transaction_type || "").toLowerCase() === "debit") {
        debits += amount;
      }
    }
    return {
      totalCredits: Math.round(credits * 100) / 100,
      totalDebits: Math.round(debits * 100) / 100,
    };
  }, [transactions]);

  const updateTransaction = (index, patch) => {
    setTransactions((prev) =>
      prev.map((t, i) =>
        i === index ? { ...t, ...patch, is_corrected: true } : t
      )
    );
  };

  const transactionsChanged = transactions.some((t) => t.is_corrected);

  const hasChanges =
    companyChanged ||
    periodChanged ||
    transactionsChanged ||
    nameChanged ||
    incomeChanged ||
    yearChanged;

  const handleApprove = () => {
    const corrections = {};
    if (isIras) {
      if (nameChanged) corrections.individual_name = individualName;
      if (incomeChanged) corrections.total_income = Number(totalIncome);
      if (yearChanged) corrections.year_of_assessment = yearOfAssessment;
    } else {
      if (companyChanged) corrections.company_name = companyName;
      if (periodChanged) corrections.statement_period = statementPeriod;
      if (transactionsChanged) {
        corrections.transactions = transactions.map((t) => ({
          date: t.date ?? "",
          description: t.description ?? "",
          amount: Number(t.amount) || 0,
          transaction_type: t.transaction_type || "debit",
          raw_text: t.raw_text ?? "",
          is_corrected: Boolean(t.is_corrected),
        }));
      }
    }
    onApprove(corrections, hasChanges);
  };

  return (
    <section className="card overflow-hidden animate-fade-in-up">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Verify extracted data
            </h2>
            <span className="badge bg-brand-50 text-brand-700">
              {humanizeDocType(extraction.document_type)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            These values were read automatically from the document. Check them
            against the original and edit anything that's wrong. Fields you
            change turn amber so it's clear what was reviewed by a person.
            Nothing is analyzed until you click Approve.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Amber highlights your edits
        </span>
      </header>

      <div className="space-y-6 p-6">
        {isIras ? (
          <IrasFields
            individualName={individualName}
            setIndividualName={setIndividualName}
            nameChanged={nameChanged}
            totalIncome={totalIncome}
            setTotalIncome={setTotalIncome}
            incomeChanged={incomeChanged}
            yearOfAssessment={yearOfAssessment}
            setYearOfAssessment={setYearOfAssessment}
            yearChanged={yearChanged}
            busy={busy}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name" corrected={companyChanged}>
                <input
                  className={`input ${companyChanged ? "input-corrected" : ""}`}
                  value={companyName}
                  disabled={busy}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                />
              </Field>
              <Field label="Statement period" corrected={periodChanged}>
                <input
                  className={`input ${periodChanged ? "input-corrected" : ""}`}
                  value={statementPeriod}
                  disabled={busy}
                  onChange={(e) => setStatementPeriod(e.target.value)}
                  placeholder="e.g. 01 May 2026 - 31 May 2026"
                />
              </Field>
            </div>

            <TransactionTable
              transactions={transactions}
              updateTransaction={updateTransaction}
              busy={busy}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TotalCard
                label="Total credits"
                value={totalCredits}
                accent="emerald"
              />
              <TotalCard
                label="Total debits"
                value={totalDebits}
                accent="rose"
              />
            </div>
          </>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                className="btn-ghost"
                onClick={onBack}
                disabled={busy}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M12.7 4.3a1 1 0 010 1.4L8.4 10l4.3 4.3a1 1 0 01-1.4 1.4l-5-5a1 1 0 010-1.4l5-5a1 1 0 011.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Back
              </button>
            )}
            <p className="text-sm text-slate-500">
              {hasChanges
                ? "You've made corrections. They'll be saved before analysis."
                : "No corrections made. Approve to analyze the extracted data."}
            </p>
          </div>
          <button
            type="button"
            className="btn-primary px-6 py-3 text-base"
            onClick={handleApprove}
            disabled={busy}
          >
            {busy ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
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
                Analyzing…
              </>
            ) : (
              <>
                Approve &amp; Analyze
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.3 3.3a1 1 0 011.4 0l6 6a1 1 0 010 1.4l-6 6a1 1 0 01-1.4-1.4L14.6 11H4a1 1 0 110-2h10.6l-4.3-4.3a1 1 0 010-1.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({ label, corrected, children }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {corrected && (
          <span className="badge bg-amber-100 text-amber-700">edited</span>
        )}
      </span>
      {children}
    </label>
  );
}

function TotalCard({ label, value, accent }) {
  const accents = {
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    rose: "from-rose-50 to-white text-rose-700 ring-rose-100",
  };
  return (
    <div
      className={`rounded-xl bg-gradient-to-br p-4 ring-1 ${accents[accent]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {formatCurrency(value)}
      </p>
      <p className="text-[11px] opacity-60">Recalculates live as you edit</p>
    </div>
  );
}

function TransactionTable({ transactions, updateTransaction, busy }) {
  if (!transactions.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        No transactions were extracted from this document.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      <div className="scroll-thin max-h-[28rem] overflow-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.map((t, index) => {
              const corrected = Boolean(t.is_corrected);
              return (
                <tr
                  key={index}
                  className={[
                    "transition-colors",
                    corrected ? "bg-amber-50/60" : "hover:bg-slate-50/60",
                  ].join(" ")}
                >
                  <td className="px-4 py-2 align-top">
                    <input
                      className={`input ${corrected ? "input-corrected" : ""}`}
                      value={t.date ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        updateTransaction(index, { date: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input
                      className={`input ${corrected ? "input-corrected" : ""}`}
                      value={t.description ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        updateTransaction(index, {
                          description: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input
                      type="number"
                      step="0.01"
                      className={`input text-right tabular-nums ${corrected ? "input-corrected" : ""}`}
                      value={t.amount ?? 0}
                      disabled={busy}
                      onChange={(e) =>
                        updateTransaction(index, { amount: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <select
                      className={`input ${corrected ? "input-corrected" : ""}`}
                      value={(t.transaction_type || "debit").toLowerCase()}
                      disabled={busy}
                      onChange={(e) =>
                        updateTransaction(index, {
                          transaction_type: e.target.value,
                        })
                      }
                    >
                      <option value="credit">credit</option>
                      <option value="debit">debit</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IrasFields({
  individualName,
  setIndividualName,
  nameChanged,
  totalIncome,
  setTotalIncome,
  incomeChanged,
  yearOfAssessment,
  setYearOfAssessment,
  yearChanged,
  busy,
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Individual name" corrected={nameChanged}>
        <input
          className={`input ${nameChanged ? "input-corrected" : ""}`}
          value={individualName}
          disabled={busy}
          onChange={(e) => setIndividualName(e.target.value)}
          placeholder="Taxpayer name"
        />
      </Field>
      <Field label="Year of assessment" corrected={yearChanged}>
        <input
          className={`input ${yearChanged ? "input-corrected" : ""}`}
          value={yearOfAssessment}
          disabled={busy}
          onChange={(e) => setYearOfAssessment(e.target.value)}
          placeholder="e.g. 2024"
        />
      </Field>
      <Field label="Total income (SGD)" corrected={incomeChanged}>
        <input
          type="number"
          step="0.01"
          className={`input tabular-nums ${incomeChanged ? "input-corrected" : ""}`}
          value={totalIncome}
          disabled={busy}
          onChange={(e) => setTotalIncome(e.target.value)}
          placeholder="0.00"
        />
      </Field>
    </div>
  );
}
