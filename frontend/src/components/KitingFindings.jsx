import { formatCurrency, humanizePattern } from "../lib/format";

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

const RISK_STYLES = {
  high: {
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
    bar: "from-red-500 to-rose-500",
    ring: "ring-red-100",
    label: "High risk",
  },
  medium: {
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    bar: "from-amber-500 to-orange-500",
    ring: "ring-amber-100",
    label: "Medium risk",
  },
  low: {
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    bar: "from-emerald-500 to-teal-500",
    ring: "ring-emerald-100",
    label: "Low risk",
  },
};

/**
 * Credit-kiting findings and sales recommendations, ordered high → medium →
 * low. Each card shows a colored risk badge, humanized pattern name, the
 * explanation, a highlighted recommended action, and the triggering
 * transactions. Renders a reassuring empty state when there are no findings.
 *
 * Props:
 *   creditKiting -> report.credit_kiting: { count, findings: [...] }
 */
export default function KitingFindings({ creditKiting }) {
  const findings = (creditKiting?.findings ?? [])
    .slice()
    .sort(
      (a, b) =>
        (RISK_ORDER[a.risk_level] ?? 99) - (RISK_ORDER[b.risk_level] ?? 99)
    );

  return (
    <section className="card overflow-hidden animate-fade-in-up">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-soft">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A1.5 1.5 0 003.6 20h16.8a1.5 1.5 0 001.3-2.1l-8-14a1.5 1.5 0 00-2.6 0z" />
            </svg>
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Credit-kiting findings
            </h3>
            <p className="text-sm text-slate-500">
              Intentional cash-injection patterns &amp; sales recommendations
            </p>
          </div>
        </div>
        <span
          className={`badge ${findings.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {findings.length} {findings.length === 1 ? "finding" : "findings"}
        </span>
      </header>

      {findings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4 p-6">
          {findings.map((finding, index) => (
            <FindingCard key={index} finding={finding} />
          ))}
        </div>
      )}
    </section>
  );
}

function FindingCard({ finding }) {
  const style = RISK_STYLES[finding.risk_level] || RISK_STYLES.low;

  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ${style.ring}`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${style.bar}`}
      />
      <div className="pl-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`badge ${style.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              {humanizePattern(finding.pattern)}
            </h4>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {finding.explanation}
        </p>

        <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.5 1a5.5 5.5 0 00-3.4 9.8c.4.3.6.7.7 1.1l.2 1.1h5l.2-1.1c.1-.4.3-.8.7-1.1A5.5 5.5 0 009.5 1z" />
              <path d="M7 15h6v1a2 2 0 01-2 2H9a2 2 0 01-2-2v-1z" />
            </svg>
            Recommended action for sales
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {finding.suggested_action}
          </p>
        </div>

        {finding.related_transactions?.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Triggering transactions
            </p>
            <ul className="space-y-1.5">
              {finding.related_transactions.map((tx, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="whitespace-nowrap font-mono text-xs text-slate-400">
                      {tx.date}
                    </span>
                    <span className="truncate text-slate-700">
                      {tx.description}
                    </span>
                  </div>
                  <span className="whitespace-nowrap font-semibold tabular-nums text-slate-900">
                    {formatCurrency(tx.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-soft">
        <svg
          className="h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 12l2 2 4-4" />
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      <h4 className="text-base font-bold text-slate-900">
        No credit-kiting patterns detected
      </h4>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        The verified transactions show no signs of circular fund movement,
        related-party injections, or temporary deposits. Cash flow appears
        genuine.
      </p>
    </div>
  );
}
