import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  CircularProgress,
  Stack,
  Divider,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
} from "@mui/material";
import {
  getApproverApplication,
  submitApproverDecision,
  getApplicationFileUrl,
} from "../api/client";


export default function CreditDecisionWorkbench({ applicationSummary, back, onDecision, onViewTampering, onViewLitigation, onViewRiskFlag, goHome }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approverNotes, setApproverNotes] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);
  const applicationId = applicationSummary?.application_id;

  useEffect(() => {
    async function loadApplication() {
      try {
        const data = await getApproverApplication(applicationId);
        setApplication(data);
      } catch (err) {
        setError(err.message || "Unable to load application.");
      } finally {
        setLoading(false);
      }
    }

    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);

  const formatCurrency = (value) => {
    if (!value && value !== 0) return "-";
    return `$${Number(value).toLocaleString()}`;
  };
  
  const handleDecision = async (decision) => {
    try {
      setDecisionLoading(true);

      const approvedAmount =
        decision === "APPROVED"
          ? application.requested_quantum
          : decision === "SUBJECT TO APPROVAL"
          ? application.recommended_amount
          : 0;

      const result = await submitApproverDecision(
        application.application_id,
        decision,
        approvedAmount,
        approverNotes
      );

      setApplication((prev) => ({
        ...prev,
        status: result.status,
        approver_decision: result.approver_decision,
        approved_amount: result.approved_amount,
        approver_notes: result.approver_notes,
      }));

      alert("Decision recorded successfully.");
      onDecision?.(application, decision);
      back();
    } catch (err) {
      alert(err.message || "Failed to record decision.");
    } finally {
      setDecisionLoading(false);
    }
  };
  const decisionLabel = application?.system_decision || "PENDING_REVIEW";

  const decisionColor =
    decisionLabel === "APPROVE"
      ? "success"
      : decisionLabel === "REJECT"
      ? "error"
      : "warning";

  const uw = application?.underwriting || {};
  const fin = uw.financials || {};
  const singpass = application?.singpass_profile || {};
  const propertyOwnership = singpass.propertyOwnership;
  const rentAmount = singpass.rentAmount;

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f6f8fc" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f6f8fc" }}>
        <Paper sx={{ p: 5, borderRadius: 4, textAlign: "center" }}>
          <Typography color="error" sx={{ mb: 3 }}>{error}</Typography>
          <Button variant="contained" onClick={back}>Back</Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f6f8fc", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <Box sx={{ background: "linear-gradient(120deg, #001A3F 0%, #002E5D 45%, #005EB8 100%)", color: "white", px: 4, py: 4 }}>
        <Box sx={{ maxWidth: 1250, mx: "auto" }}>
          <Stack direction="row" alignItems="center" spacing={0.7} onClick={goHome} sx={{ cursor: "pointer", mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, opacity: 0.8, letterSpacing: "0.02em", "&:hover": { opacity: 1 } }}>
              UOB Credit AI
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={back} sx={{ mb: 2, bgcolor: "white", borderColor: "white" }}>
            ← Back to Work Queue
          </Button>

          <Typography sx={{ fontSize: 30, fontWeight: 850, letterSpacing: "-0.03em" }}>
            Credit Decision Workbench
          </Typography>

          <Typography sx={{ mt: 1, opacity: 0.9 }}>
            Review AI recommendation, risk factors and supporting evidence before recording final decision.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1250, mx: "auto", p: 4 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 12px 28px rgba(15,23,42,.08)", mb: 4 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="flex-start" spacing={3}>
            <Box>
              <Typography sx={{ fontSize: 24, fontWeight: 800 }}>
                {application.company_name}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {application.reference_number} · UEN {application.uen}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4} alignItems="center" sx={{ whiteSpace: "nowrap", pt: 0.3 }}>
              <Box>
                <Typography color="text.secondary" sx={{ fontSize: 15, fontWeight: 700, display: "inline", mr: 1 }}>
                  AI Recommendation:
                </Typography>
                <Chip label={decisionLabel} color={decisionColor} sx={{ fontWeight: 800, fontSize: 14 }} />
              </Box>
              {propertyOwnership && (
                <Box>
                  <Typography color="text.secondary" sx={{ fontSize: 15, fontWeight: 700, display: "inline", mr: 1 }}>
                    Business Premises:
                  </Typography>
                  <Chip
                    label={propertyOwnership === "owned" ? "Owned by Company" : `Rented – S$${Number(rentAmount || 0).toLocaleString()} / month`}
                    sx={{ fontWeight: 800, bgcolor: "#dbeafe", color: "#1d4ed8", fontSize: 14 }}
                  />
                </Box>
              )}
            </Stack>
          </Stack>
        </Paper>

        <EvidenceSection application={application} formatCurrency={formatCurrency} onViewTampering={onViewTampering} onViewLitigation={onViewLitigation} />

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Panel title="AI Decision Rationale">
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {application.system_reason}
              </Typography>
            </Panel>

            <Panel title="Risk Flags">
              {application.risk_flags && application.risk_flags.length > 0 ? (
                <Stack spacing={1.5}>
                  {application.risk_flags.map((flag, index) => {
                    const flagLower = flag.toLowerCase();
                    const isTampering = flagLower.includes("bank statement integrity") || flagLower.includes("tampering");
                    const isLitigation = flagLower.includes("litigation") || flagLower.includes("charge");
                    return (
                      <Button
                        key={index}
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                          if (isTampering) onViewTampering?.(application);
                          else if (isLitigation) onViewLitigation?.(application);
                          else onViewRiskFlag?.(flag, application);
                        }}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          justifyContent: "flex-start",
                          textTransform: "none",
                          borderColor: "#fecaca",
                          bgcolor: "#fef2f2",
                          "&:hover": { bgcolor: "#fee2e2", borderColor: "#fca5a5" },
                        }}
                      >
                        <Typography fontWeight={700} color="#b91c1c" textAlign="left">
                          ⚠️ {flag}
                        </Typography>
                      </Button>
                    );
                  })}
                </Stack>
              ) : (
                <Typography color="text.secondary">No material risk flags surfaced by the automated assessment.</Typography>
              )}
            </Panel>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Panel title="Financial Indicators">
              <Stack spacing={1.6}>
                <SummaryRow label="Annualised Revenue" value={fin.annualised_revenue != null ? formatCurrency(fin.annualised_revenue) : formatCurrency(application.annualised_revenue)} />
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: 3, alignItems: "center" }}>
                  <Typography color="text.secondary">DSCR</Typography>
                  <Typography
                    fontWeight={700}
                    textAlign="right"
                    sx={{
                      color:
                        fin.dscr >= 2.0
                          ? "#15803d"
                          : fin.dscr >= 1.5
                          ? "#1d4ed8"
                          : fin.dscr >= 1.2
                          ? "#b45309"
                          : fin.dscr >= 1.0
                          ? "#b91c1c"
                          : "#991b1b",
                      bgcolor:
                        fin.dscr >= 2.0
                          ? "#dcfce7"
                          : fin.dscr >= 1.5
                          ? "#eff6ff"
                          : fin.dscr >= 1.2
                          ? "#fef3c7"
                          : fin.dscr >= 1.0
                          ? "#fee2e2"
                          : "#fef2f2",
                      px: 1.5,
                      py: 0.3,
                      borderRadius: 1.5,
                      fontSize: 17,
                    }}
                  >
                    {fin.dscr != null ? fin.dscr.toFixed(2) : application.dscr ?? "-"}
                  </Typography>
                </Box>
                <SummaryRow label="Existing Debt" value={application.existing_debt != null ? formatCurrency(application.existing_debt) : "—"} />
                <SummaryRow label="Credit Kiting Score" value={application.credit_kiting_score != null ? `${application.credit_kiting_score}/100` : "—"} />
                <SummaryRow label="Industry" value={application.industry || "-"} />
                <Divider sx={{ my: 1 }} />
                <SummaryRow label="MUE" value={fin.mue != null ? formatCurrency(fin.mue) : "—"} />
                <SummaryRow label="FCC (avg closing balance)" value={fin.fcc != null ? formatCurrency(fin.fcc) : "—"} />
                <SummaryRow label="Tangible Net Worth" value={fin.tnw != null ? formatCurrency(fin.tnw) : "—"} />
                <SummaryRow label="EBITDA" value={fin.ebitda != null ? `${formatCurrency(fin.ebitda)}${fin.ebitda_margin != null ? ` (${fin.ebitda_margin}%)` : ""}` : "—"} />
                <SummaryRow label="Serviceable income" value={fin.serviceable_income != null ? formatCurrency(fin.serviceable_income) : "—"} />
                <SummaryRow label="Monthly debt service" value={fin.monthly_debt_service != null ? formatCurrency(fin.monthly_debt_service) : "—"} />
                <SummaryRow label="Annual debt service" value={fin.annual_debt_service != null ? formatCurrency(fin.annual_debt_service) : "—"} />
              </Stack> 
            </Panel>

            <Panel title="Approver Action">
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Final decision must be confirmed by a Credit Approver.
              </Typography>

              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Approver Notes"
                placeholder="Add rationale, conditions, or follow-up instructions."
                value={approverNotes}
                onChange={(e) => setApproverNotes(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Stack spacing={1.5}>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  disabled={decisionLoading}
                  sx={{ borderRadius: 3, fontWeight: 800 }}
                  onClick={() => handleDecision("APPROVED")}
                >
                  Approve
                </Button>

                <Button
                  variant="contained"
                  color="warning"
                  fullWidth
                  disabled={decisionLoading}
                  sx={{ borderRadius: 3, fontWeight: 800 }}
                  onClick={() => handleDecision("SUBJECT TO APPROVAL")}
                >
                  Counter-offer / Subject to Approval
                </Button>

                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  disabled={decisionLoading}
                  sx={{ borderRadius: 3, fontWeight: 800 }}
                  onClick={() => handleDecision("REJECTED")}
                >
                  Reject
                </Button>
              </Stack>
            </Panel>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

function Panel({ title, children }) {
  return (
    <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 10px 24px rgba(15,23,42,.06)", mb: 3 }}>
      <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function SummaryRow({ label, value }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: 3, alignItems: "center" }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={700} textAlign="right">{value}</Typography>
    </Box>
  );
}

function PassChip({ passed, passLabel = "Pass", failLabel = "Review" }) {
  return (
    <Chip
      size="small"
      label={passed ? passLabel : failLabel}
      sx={{
        fontWeight: 800,
        bgcolor: passed ? "#dcfce7" : "#fee2e2",
        color: passed ? "#15803d" : "#b91c1c",
      }}
    />
  );
}

function RatioTile({ label, value, ok, hint }) {
  const color = ok == null ? "#0f172a" : ok ? "#15803d" : "#b91c1c";
  const bg = ok == null ? "#f8fafc" : ok ? "#f0fdf4" : "#fef2f2";
  return (
    <Box sx={{ p: 2, borderRadius: 3, bgcolor: bg, border: "1px solid #e5e7eb", height: "100%" }}>
      <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 900, color, mt: 0.5 }}>{value}</Typography>
      {hint && <Typography fontSize={11} color="text.secondary">{hint}</Typography>}
    </Box>
  );
}

function groupDeductions(items) {
  const map = new Map();
  for (const it of items) {
    const key = `${it.lender}||${it.amount}||${it.description}`;
    if (!map.has(key)) {
      map.set(key, { lender: it.lender, description: it.description, amount: it.amount, months: 0 });
    }
    map.get(key).months += 1;
  }
  return Array.from(map.values());
}

function EvidenceSection({ application, formatCurrency, onViewTampering, onViewLitigation }) {
  const uw = application.underwriting || {};
  const bank = uw.bank_ocr || {};
  const cbs = uw.credit_bureau || {};
  const acra = uw.acra || {};
  const litigation = uw.litigation || {};
  const aml = uw.aml || {};

  const pgs = application.personal_guarantors || [];
  const pgCoverage = Number(application.pg_coverage ?? 0);
  const pgCoverageOk = pgCoverage >= 50;
  const agesKnown = pgs.some((p) => p.age != null);
  const pgAgesOk = pgs.every((p) => p.age == null || p.age < 70);

  const fin = uw.financials || {};
  const kiting = uw.credit_kiting || {};
  const debt = uw.existing_debt || {};

  const rm = uw.risk_model || {};
  const pd = rm.pd_percent;
  const band = rm.rating_band;

  const bandColor =
    band === "Low" || band === "Moderate"
      ? { bg: "#dcfce7", fg: "#15803d", bar: "#16a34a" }
      : band === "Elevated"
      ? { bg: "#fef3c7", fg: "#b45309", bar: "#d97706" }
      : { bg: "#fee2e2", fg: "#b91c1c", bar: "#dc2626" };

  return (
    <>
      {/* Credit Flash Model — PD + approved limit */}
      {rm.pd_percent != null && (
        <Panel title={`${rm.model_name || "Credit Risk Model"} — Probability of Default`}>
          <Grid container spacing={3.5} alignItems="stretch">
            <Grid size={{ xs: 12, md: 5.5 }}>
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography
                    sx={{
                      fontSize: 58,
                      fontWeight: 950,
                      color: bandColor.fg,
                      lineHeight: 1,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {pd}%
                  </Typography>

                  <Chip
                    label={`${band} risk`}
                    sx={{
                      fontWeight: 900,
                      bgcolor: bandColor.bg,
                      color: bandColor.fg,
                      px: 1,
                    }}
                  />
                </Stack>

                <Typography color="text.secondary" fontSize={14} sx={{ mt: 1 }}>
                  12-month probability of default · {rm.model_name} {rm.model_version || ""}
                </Typography>

                {/* KEEPING YOUR ORIGINAL COLOURED BAR */}
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Number(pd) || 0)}
                  sx={{
                    mt: 2,
                    height: 10,
                    borderRadius: 99,
                    bgcolor: "#e5e7eb",
                    "& .MuiLinearProgress-bar": { bgcolor: bandColor.bar },
                  }}
                />
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Box
                sx={{
                  height: "100%",
                  p: 3,
                  borderRadius: 4,
                  bgcolor: "#f8fbff",
                  border: "1px solid #dbeafe",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#1d4ed8",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  Model approved limit
                </Typography>

                <Typography sx={{ mt: 1, fontSize: 32, fontWeight: 950, color: "#0f172a" }}>
                  {formatCurrency(rm.approved_limit)}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Typography fontSize={13} color="text.secondary">
                  Requested
                </Typography>
                <Typography fontSize={18} fontWeight={850} color="#0f172a">
                  {formatCurrency(rm.requested_amount)}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 3.5 }}>
              <Box
                sx={{
                  height: "100%",
                  p: 3,
                  borderRadius: 4,
                  bgcolor: "#ffffff",
                  border: "1px solid #e5e7eb",
                }}
              >
                <Typography fontWeight={900} fontSize={15} sx={{ mb: 1.5, color: "#0f172a" }}>
                  Key PD drivers
                </Typography>

                {rm.drivers && rm.drivers.length > 0 ? (
                  <Stack spacing={1.2}>
                    {rm.drivers.map((d, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: "flex",
                          gap: 1.2,
                          alignItems: "flex-start",
                        }}
                      >
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            bgcolor: bandColor.fg,
                            mt: "7px",
                            flexShrink: 0,
                          }}
                        />
                        <Typography fontSize={14} color="#334155" fontWeight={650}>
                          {d}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography fontSize={14} color="text.secondary">
                    No adverse drivers — baseline bureau grade only.
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </Panel>
      )}





    <Panel title="Bank Statement — OCR Extraction">
      <Grid container spacing={2.2}>
        {[
          {
            label: "Detected bank",
            value: bank.bank || "—",
          },
          {
            label: "Total credits",
            value: bank.total_credits != null ? formatCurrency(bank.total_credits) : "—",
          },
          {
            label: "Loan repayments detected",
            value: bank.detected_loans ?? "—",
          },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3.5,
                bgcolor: "#ffffff",
                border: "1px solid #e5e7eb",
                height: "100%",
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 750,
                  color: "#64748b",
                  mb: 1,
                }}
              >
                {item.label}
              </Typography>

              <Typography
                sx={{
                  fontSize: 26,
                  fontWeight: 950,
                  color: "#0f172a",
                  letterSpacing: "-0.03em",
                }}
              >
                {item.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box
        sx={{
          mt: 2.5,
          p: 0,
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid ${
            bank.has_fraud_tampering || kiting.flagged ? "#fecaca" : "#bbf7d0"
          }`,
          bgcolor: bank.has_fraud_tampering || kiting.flagged ? "#fff7f7" : "#f0fdf4",
        }}
      >
        <Grid container>
          <Grid size={{ xs: 12, md: 3 }}>
            <Box sx={{ p: 2.8 }}>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#64748b",
                  mb: 0.8,
                }}
              >
                Credit-kiting risk score
              </Typography>

              <Typography
                sx={{
                  fontSize: 26,
                  fontWeight: 950,
                  color: kiting.flagged ? "#b91c1c" : "#15803d",
                  letterSpacing: "-0.03em",
                }}
              >
                {kiting.score != null ? `${kiting.score}/100` : "—"}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Box
              sx={{
                p: 2.8,
                height: "100%",
                borderLeft: { xs: "none", md: "1px solid #fecaca" },
                borderTop: { xs: "1px solid #fecaca", md: "none" },
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#64748b",
                  mb: 0.8,
                }}
              >
                Suspicious credit-kiting volume
              </Typography>

              <Typography
                sx={{
                  fontSize: 26,
                  fontWeight: 950,
                  color: bank.flagged_kiting_volume > 0 ? "#b91c1c" : "#15803d",
                  letterSpacing: "-0.03em",
                }}
              >
                {formatCurrency(bank.flagged_kiting_volume || kiting.flagged_volume || 0)}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Box
              sx={{
                p: 2.8,
                height: "100%",
                borderLeft: { xs: "none", md: "1px solid #fecaca" },
                borderTop: { xs: "1px solid #fecaca", md: "none" },
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#64748b",
                  mb: 0.8,
                }}
              >
                Statement integrity
              </Typography>

              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 950,
                  color: bank.has_fraud_tampering ? "#b91c1c" : "#15803d",
                  letterSpacing: "-0.02em",
                }}
              >
                {bank.has_fraud_tampering ? "Tampering flagged" : "No tampering detected"}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Box
              sx={{
                p: 2.8,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "flex-start", md: "flex-end" },
              }}
            >
              {bank.has_fraud_tampering ? (
                <Button
                  variant="contained"
                  sx={{
                    borderRadius: 3,
                    fontWeight: 900,
                    textTransform: "none",
                    px: 3,
                    py: 1.15,
                    bgcolor: "#dc2626",
                    "&:hover": { bgcolor: "#b91c1c" },
                    boxShadow: "0 8px 18px rgba(220,38,38,.22)",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => onViewTampering?.(application)}
                >
                  View details →
                </Button>
              ) : (
                <Chip
                  label={kiting.flagged ? "Kiting flagged" : "Verified"}
                  sx={{
                    fontWeight: 900,
                    bgcolor: kiting.flagged ? "#fee2e2" : "#dcfce7",
                    color: kiting.flagged ? "#b91c1c" : "#15803d",
                  }}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {kiting.patterns && kiting.patterns.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 900, mb: 1.5, color: "#0f172a" }}>
            Flagged credit-kiting patterns from OCR
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Pattern</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Counterparty</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {kiting.patterns.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.date}</TableCell>
                  <TableCell>{p.description}</TableCell>
                  <TableCell>{p.counterparty}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatCurrency(p.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Panel>

      {/* ACRA shareholders & personal guarantee */}
      <Panel title="ACRA Shareholders & Personal Guarantee">
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            mb: 2,
            bgcolor: pgCoverageOk ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${pgCoverageOk ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
            <Typography fontWeight={800} sx={{ mr: 0.5 }}>
              Personal Guarantee Shareholding Coverage:
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography fontWeight={900} sx={{ color: pgCoverageOk ? "#15803d" : "#b91c1c" }}>
                {pgCoverage}%
              </Typography>
              <PassChip passed={pgCoverageOk} passLabel="Meets 50%" failLabel="Below 50%" />
            </Stack>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, pgCoverage)}
            sx={{
              mt: 1,
              height: 8,
              borderRadius: 99,
              bgcolor: "#e5e7eb",
              "& .MuiLinearProgress-bar": { bgcolor: pgCoverageOk ? "#16a34a" : "#dc2626" },
            }}
          />
        </Box>

        <Typography fontWeight={800} sx={{ mb: 1 }}>
          Selected personal guarantors
        </Typography>
        {pgs.length === 0 ? (
          <Typography color="text.secondary">No personal guarantors were selected.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Shareholding</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Age</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Age &lt; 70</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pgs.map((p) => (
                <TableRow key={p.name}>
                  <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {p.shareholding != null ? `${p.shareholding}%` : "—"}
                  </TableCell>
                  <TableCell align="right">{p.age != null ? p.age : "—"}</TableCell>
                  <TableCell>
                    {p.age == null ? "—" : <PassChip passed={p.age < 70} passLabel="Yes" failLabel="No" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {agesKnown && (
          <Typography fontSize={13} sx={{ mt: 1.5 }} color={pgAgesOk ? "#15803d" : "#b91c1c"} fontWeight={700}>
            {pgAgesOk
              ? "All selected guarantors are under 70."
              : "One or more selected guarantors are 70 or older — review required."}
          </Typography>
        )}

        {acra.shareholders && acra.shareholders.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography fontWeight={800} sx={{ mb: 1 }}>
              All shareholders (ACRA / MyInfo Business)
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {acra.shareholders.map((s) => (
                <Chip
                  key={s.name}
                  variant="outlined"
                  label={`${s.name} · ${s.shareholding != null ? s.shareholding + "%" : "—"}`}
                  sx={{ fontWeight: 700 }}
                />
              ))}
            </Stack>
          </>
        )}
      </Panel>

      {/* Credit kiting detection
      {kiting.score != null && (
        <Panel title="Credit-Kiting Detection">
          <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                Kiting risk score
              </Typography>
              <Typography sx={{ fontSize: 30, fontWeight: 900, color: kiting.flagged ? "#b91c1c" : "#15803d" }}>
                {kiting.score}/100
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                Flagged volume
              </Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
                {formatCurrency(kiting.flagged_volume || 0)}
              </Typography>
            </Box>
            <PassChip passed={!kiting.flagged} passLabel="No kiting detected" failLabel="Kiting patterns flagged" />
          </Stack>
          {kiting.patterns && kiting.patterns.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Pattern</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Counterparty</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {kiting.patterns.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p.date}</TableCell>
                    <TableCell>{p.description}</TableCell>
                    <TableCell>{p.counterparty}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      )} */}

      {/* Existing debt detection */}
      {debt.recurring_deductions && debt.recurring_deductions.length > 0 && (
        <Panel title="Existing Debt Detection — 6-Month Bank Statement Analysis">
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <SummaryRow label="Declared by applicant" value={debt.declared || "NIL"} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <SummaryRow label="Detected monthly servicing" value={formatCurrency(debt.detected_monthly || 0)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <SummaryRow label="Annualised" value={formatCurrency(debt.annualised || 0)} />
            </Grid>
          </Grid>
          <Box sx={{ mb: 2 }}>
            <PassChip
              passed={!debt.undeclared}
              passLabel="Matches declared debt"
              failLabel="Undeclared debt detected"
            />
            {debt.undeclared && debt.undeclared_note && (
              <Typography color="error" fontSize={13} fontWeight={700} sx={{ mt: 1 }}>
                {debt.undeclared_note}
              </Typography>
            )}
          </Box>
          <Typography fontWeight={800} sx={{ mb: 1 }}>
            Recurring deductions detected across {debt.consistent_months || 6} months
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Lender</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Months seen</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Monthly amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupDeductions(debt.recurring_deductions).map((g, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontWeight: 700 }}>{g.lender}</TableCell>
                  <TableCell>{g.description}</TableCell>
                  <TableCell>
                    <Chip size="small" label={`${g.months} / 6`} sx={{ fontWeight: 800, bgcolor: g.months >= 6 ? "#dbeafe" : "#f1f5f9", color: "#1d4ed8" }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(g.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography fontSize={12} color="text.secondary" sx={{ mt: 1.5 }}>
            A fixed amount recurring on/around the same day every month is treated as an active debt facility.
          </Typography>
        </Panel>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Panel title="AML / Sanctions & Blacklist Screening">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color="text.secondary">Company & keymen screening</Typography>
              <PassChip passed={!!aml.passed} passLabel="Clear" failLabel="Hit" />
            </Stack>
            {!aml.passed && aml.reason && (
              <Typography color="error" sx={{ mt: 1.5 }} fontWeight={700}>
                {aml.reason}
              </Typography>
            )}
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Panel title="Litigation Search">
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Typography color="text.secondary" sx={{ mt: 0.3 }}>
                Outstanding cases/charges: {litigation.count ?? 0}
              </Typography>
              {!litigation.passed ? (
                <Button
                  size="small"
                  variant="contained"
                  sx={{
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: "none",
                    px: 1.5,
                    py: 0.8,
                    bgcolor: "#d97706",
                    "&:hover": { bgcolor: "#b45309" },
                    boxShadow: "0 2px 8px rgba(217,119,6,.3)",
                    mr: -0.5,
                    mt: -0.5,
                  }}
                  endIcon={<Typography sx={{ fontSize: 16, lineHeight: 1 }}>→</Typography>}
                  onClick={() => onViewLitigation?.(application)}
                >
                  Issues Found
                </Button>
              ) : (
                <PassChip passed={true} passLabel="Clear" failLabel="Found" />
              )}
            </Box>
            {litigation.charges && litigation.charges.length > 0 && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {litigation.charges.map((c, i) => (
                  <Typography key={i} fontSize={13} color="text.secondary">
                    ⚠️ {c.chargee_bank || "Charge"} · {formatCurrency(c.charge_amount)} · {c.status}
                  </Typography>
                ))}
              </Stack>
            )}
          </Panel>
        </Grid>
      </Grid>

      {uw.industry_analysis && (
        <Panel title="AI Industry Analysis">
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={800}>{uw.industry_analysis.sector}</Typography>
              <Chip
                label={`${uw.industry_analysis.risk_level} risk`}
                size="small"
                sx={{
                  fontWeight: 800,
                  bgcolor:
                    uw.industry_analysis.risk_level === "Low"
                      ? "#dcfce7"
                      : uw.industry_analysis.risk_level === "Moderate"
                      ? "#fef3c7"
                      : "#fee2e2",
                  color:
                    uw.industry_analysis.risk_level === "Low"
                      ? "#15803d"
                      : uw.industry_analysis.risk_level === "Moderate"
                      ? "#b45309"
                      : "#b91c1c",
                }}
              />
            </Stack>

            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {uw.industry_analysis.summary}
            </Typography>

            <Box>
              <Typography fontWeight={700} sx={{ mb: 1, fontSize: 14 }}>
                Key risks identified
              </Typography>
              <Stack spacing={1}>
                {uw.industry_analysis.key_risks.map((risk, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "#fef2f2",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <Typography fontSize={13} fontWeight={600} color="#b91c1c">
                      ⚠ {risk}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f0f7ff", border: "1px solid #bfdbfe" }}>
              <Typography fontSize={13} fontWeight={700} color="#1d4ed8">
                Outlook: {uw.industry_analysis.outlook}
              </Typography>
            </Box>


          </Stack>
        </Panel>
      )}

      {application?.files && Object.values(application.files).some(Boolean) && (
        <Panel title="Uploaded Documents">
          <Stack spacing={1.5}>
            {[
              { key: "bank_statement", label: "Corporate Bank Statement" },
              { key: "income_statement", label: "IRAS Income Statement" },
              { key: "financials", label: "Company Financials" },
              { key: "ic", label: "NRIC / ID Copy" },
            ].map((doc) => {
              const filename = application.files[doc.key];
              if (!filename) return null;
              return (
                <Box
                  key={doc.key}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <Box>
                    <Typography fontWeight={700} fontSize={14}>
                      {doc.label}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">
                      {filename}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    href={getApplicationFileUrl(application.application_id, doc.key)}
                    target="_blank"
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                  >
                    Open
                  </Button>
                </Box>
              );
            })}
          </Stack>
        </Panel>
      )}
    </>
  );
}