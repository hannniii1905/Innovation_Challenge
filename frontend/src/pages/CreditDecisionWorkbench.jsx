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
} from "@mui/material";
import {
  getApproverApplication,
  submitApproverDecision,
} from "../api/client";


export default function CreditDecisionWorkbench({ applicationSummary, back }) {
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
          : decision === "SUBJECT_TO_APPROVAL"
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
      <Box sx={{ background: "linear-gradient(100deg,#4f46e5,#8b5cf6,#d946ef)", color: "white", px: 4, py: 4 }}>
        <Box sx={{ maxWidth: 1250, mx: "auto" }}>
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
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={3}>
            <Box>
              <Typography sx={{ fontSize: 24, fontWeight: 800 }}>
                {application.company_name}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {application.reference_number} · UEN {application.uen}
              </Typography>
            </Box>

            <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
              <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
                AI Recommendation
              </Typography>
              <Chip label={decisionLabel} color={decisionColor} sx={{ mt: 1, fontWeight: 800 }} />
            </Box>
          </Stack>

          <Divider sx={{ my: 4 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Metric label="Requested Amount" value={formatCurrency(application.requested_quantum)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Metric label="Recommended Amount" value={formatCurrency(application.recommended_amount)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Metric label="Credit Score" value={application.credit_score ?? "-"} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Metric label="Current Status" value={application.status || "PENDING"} />
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Panel title="AI Decision Rationale">
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {application.system_reason}
              </Typography>
            </Panel>

            <Panel title="Risk Flags">
              {application.risk_flags && application.risk_flags.length > 0 ? (
                <Stack spacing={1.5}>
                  {application.risk_flags.map((flag, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Typography fontWeight={700}>⚠️ {flag}</Typography>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No material risk flags surfaced by the automated assessment.</Typography>
              )}
            </Panel>
          </Grid>

          <Grid item xs={12} md={5}>
            <Panel title="Financial Indicators">
              <Stack spacing={1.6}>
                <SummaryRow label="Annualised Revenue" value={formatCurrency(application.annualised_revenue)} />
                <SummaryRow label="DSCR" value={application.dscr ?? "-"} />
                <SummaryRow label="Existing Debt" value={formatCurrency(application.existing_debt)} />
                <SummaryRow label="Credit Kiting Score" value={application.credit_kiting_score ?? "-"} />
                <SummaryRow label="Industry" value={application.industry || "-"} />
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
                  onClick={() => handleDecision("SUBJECT_TO_APPROVAL")}
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

function Metric({ label, value }) {
  return (
    <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "#f8fafc", border: "1px solid #e5e7eb" }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.8, fontSize: 20, fontWeight: 800 }}>
        {value}
      </Typography>
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