import { formatCurrency, humanizeDocType } from "../lib/format";

/**
 * Enhanced UOB Credit Model Analytics Dashboard.
 * Integrates raw OCR statement insights with downstream underwriting data fields.
 */
export default function ResultsDashboard({ report }) {
  if (!report) return null;

  if (report.document_type === "iras_noa") {
    return <IrasDashboard report={report} />;
  }

  const loan = report.loan_repayments || {
    count: 0,
    total_amount: 0,
    transactions: [],
  };

  const suspicious = report.suspicious_credits || {
    count: 0,
    transactions: [],
  };

  // Safe fallback evaluations mapping matrix variables
  const final_status = report.evaluation_status || "refer_to_CA"; 
  const final_pd = report.probability_of_default ?? 8;
  const true_turnover = report.true_adjusted_turnover ?? (report.total_credits - (report.kiting_volume ?? 0));
  const integrity_status = report.integrity_check || "PASSED";
  const approved_offer = report.recommended_offer ?? Math.min(report.requested_quantum ?? 50000, true_turnover * 0.15);
  const max_capacity = report.max_system_cap ?? (true_turnover * 0.15);
  const explanation = report.justification || "Application analysis processing complete. Review identified liabilities and transaction risk parameters.";
  const warnings_list = report.engine_warnings || [];

  return (
    <section className="space-y-6 animate-fade-in-up">
      
      {/* =====================================================================
          TOP BANNER: CREDIT STRATIFICATION ASSESSMENT RESPONSE
          ===================================================================== */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border font-sans gap-4
        ${final_status === 'APPROVE' ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900' : 
          final_status === 'refer_to_CA' ? 'bg-amber-50/60 border-amber-100 text-amber-900' : 
          'bg-rose-50/60 border-rose-100 text-rose-900'}`}
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            System Underwriting Appraisal Stage
          </span>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {final_status === 'APPROVE' ? '✓ AUTOMATED APPROVAL' : 
             final_status === 'refer_to_CA' ? '⚠ REVIEW REQUIRED: COUNTER-OFFER' : 
             '🛑 SYSTEM REJECTION'}
          </h2>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-xs text-slate-400 block">Assessment Metric Mapping</span>
          <span className="text-xl font-black tracking-tight tabular-nums">
            Decision State: {final_status}
          </span>
        </div>
      </div>

      {/* =====================================================================
          ZONE 1 & ZONE 2: PRIMARY INSIGHT HERO MATRIX CARDS
          ===================================================================== */}
      <div className="grid gap-4 sm:grid-cols-3">
        <HeroCard
          label="Zone 1: Corporate Identity"
          value={report.company_name || "—"}
          sub={humanizeDocType(report.bank)}
          icon="building"
          accent="brand"
        />
        
        <HeroCard
          label="Zone 2: Raw Bank Turnover"
          value={formatCurrency(report.total_credits)}
          sub="Gross aggregate statements input"
          icon="up"
          accent="violet"
        />
        
        <HeroCard
          label="Zone 2: True Operating Revenue"
          value={formatCurrency(true_turnover)}
          sub="Proxy STO (Less circular volume)"
          icon="emerald_check"
          accent="emerald"
        />
      </div>

      {/* =====================================================================
          MAIN SPLIT VIEW LAYOUT GRID
          ===================================================================== */}
      <div className="grid gap-6 lg:grid-cols-5 items-start">
        
        {/* LEFT COLUMN: CRITICAL VOLATILITY RISKS (3/5 Grid Space) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* ZONE 3: UNDERWRITING PENALTIES & INTEGRITY VERIFICATIONS */}
          <div className="card p-6 space-y-4">
            <header className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Zone 3: Risk Penalties & Bureau Disclosures
              </h3>
              <p className="text-xs text-slate-400">Cross-checking pre-questionnaire statements vs Experian ACRA registry logs</p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-xs text-slate-400 block mb-1">Probability of Default (PD)</span>
                <span className={`text-2xl font-extrabold tabular-nums ${final_pd > 45 ? 'text-rose-600' : 'text-amber-600'}`}>
                  {final_pd}%
                </span>
              </div>
              <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-4 text-center flex flex-col justify-center">
                <span className="text-xs text-slate-400 block mb-1">Honesty Cross-Check Matrix</span>
                <span className={`text-base font-bold uppercase ${integrity_status === 'PASSED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {integrity_status}
                </span>
              </div>
            </div>

            {warnings_list.length > 0 && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Engine Flag Warnings:</h5>
                <ul className="text-xs text-amber-900 space-y-1.5 list-disc pl-4 font-medium">
                  {warnings_list.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* LOAN DETECTION TABLE MODULE VIEW */}
          <div className="card overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Loan repayments
                </h3>
                <span className="badge bg-slate-100 text-slate-600">
                  {loan.count} found
                </span>
              </div>
              {loan.count > 0 && (
                <span className="text-sm font-semibold text-slate-700">
                  {formatCurrency(loan.total_amount)} total
                </span>
              )}
            </header>

            {loan.transactions?.length ? (
              <div className="scroll-thin max-h-64 overflow-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Description</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loan.transactions.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-6 py-3 text-slate-600">
                          {t.date}
                        </td>
                        <td className="px-6 py-3 text-slate-800">
                          {t.description}
                        </td>
                        <td className="px-6 py-3">
                          <span className="badge bg-brand-50 text-brand-700">
                            {t.loan_type || "loan"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right font-semibold tabular-nums text-slate-900">
                          {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                No loan repayments were detected in this statement.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: CORE DECISION & ALLOCATIONS (2/5 Grid Space) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ZONE 4: CREDIT FINANCING CAPACITY SUMMARY */}
          <div className="card p-6 space-y-4 border-l-4 border-l-brand-500">
            <header className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Zone 4: Lending Sizing Summary Offer
              </h3>
              <p className="text-xs text-slate-400">Risk-adjusted asset optimization capital allocations</p>
            </header>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">Requested Quantum:</span>
                <span className="font-bold text-slate-800">{formatCurrency(report.requested_quantum ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">Max Safe Capacity (15%):</span>
                <span className="font-bold text-slate-800">{formatCurrency(max_capacity)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl mt-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Recommended Offer:</span>
                <span className="text-lg font-black text-brand-600 tabular-nums">{formatCurrency(approved_offer)}</span>
              </div>
            </div>

            <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-4 text-xs leading-relaxed text-slate-600">
              <strong className="text-slate-800 block mb-1">Credit Decision Note:</strong>
              {explanation}
            </div>
          </div>

          {/* SUSPICIOUS CREDITS DISCOVERY LOGS */}
          <SuspiciousCreditsCard suspicious={suspicious} />

        </div>

      </div>
    </section>
  );
}

/**
 * Renders the FraudDetector output: credits that look like deliberate income
 * inflation / money injection ahead of a loan application. Each flagged credit
 * carries a 0-1 risk score and a human-readable reason aggregating every
 * triggered heuristic (round number, circular transfer, end-of-period timing,
 * frequency spike).
 */
function SuspiciousCreditsCard({ suspicious }) {
  const rows = suspicious?.transactions ?? [];

  return (
    <div className="card overflow-hidden">
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Suspicious credits
          </h3>
          <span className="badge bg-slate-100 text-slate-600">
            {suspicious?.count ?? 0} flagged
          </span>
        </div>
      </header>

      {rows.length ? (
        <div className="scroll-thin max-h-64 overflow-auto text-xs">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Risk</th>
                <th className="px-4 py-2.5">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {rows.map((t, i) => (
                <tr key={i} className="hover:bg-slate-50/60 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {t.date}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    <RiskBadge score={t.risk_score} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 leading-normal">{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-8 text-center text-xs text-slate-500">
          No suspicious credits were detected in this statement.
        </div>
      )}
    </div>
  );
}

function RiskBadge({ score }) {
  const n = Number(score) || 0;
  const pct = Math.round(n * 100);
  let cls = "bg-emerald-50 text-emerald-700";
  let label = "Low";
  if (n >= 0.8) {
    cls = "bg-red-50 text-red-700";
    label = "High";
  } else if (n >= 0.5) {
    cls = "bg-amber-50 text-amber-700";
    label = "Medium";
  }
  return (
    <span className={`badge ${cls}`}>
      {label} · {pct}%
    </span>
  );
}


function IrasDashboard({ report }) {
  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="grid gap-4 sm:grid-cols-3">
        <HeroCard
          label="Individual"
          value={report.individual_name || "—"}
          sub="IRAS Notice of Assessment"
          icon="building"
          accent="brand"
        />
        <HeroCard
          label="Year of assessment"
          value={report.year_of_assessment || "—"}
          sub="Tax year"
          icon="calendar"
          accent="violet"
        />
        <HeroCard
          label="Total income"
          value={formatCurrency(report.total_income)}
          sub="Assessed"
          icon="up"
          accent="emerald"
        />
      </div>
    </section>
  );
}

const ICONS = {
  building: (
    <path d="M3 21h18M5 21V5a1 1 0 011-1h7a1 1 0 011 1v16M9 8h2M9 12h2M9 16h2M14 21V9h4a1 1 0 011 1v11" />
  ),
  up: <path d="M5 15l7-7 7 7" />,
  down: <path d="M19 9l-7 7-7-7" />,
  emerald_check: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M4 11h16" />
    </>
  ),
};

function HeroCard({ label, value, sub, icon, accent }) {
  const accents = {
    brand: "from-brand-500 to-violet-500",
    emerald: "from-emerald-500 to-teal-500",
    rose: "from-rose-500 to-pink-500",
    violet: "from-violet-500 to-fuchsia-500",
  };
  return (
    <div className="card relative overflow-hidden p-5">
      <div
        className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-10 ${accents[accent]}`}
      />
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-soft ${accents[accent]}`}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ICONS[icon]}
        </svg>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-bold text-slate-900" title={value}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}