import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  Grid,
} from "@mui/material";
import { getApproverApplications, deleteApplication } from "../api/client";

export default function CreditApproverDashboard({ openApplication, onViewHistory, backToClient, decidedApplications }) {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState({
    total_applications: 0,
    approved_percentage: 0,
    further_review_percentage: 0,
  });
  const [filter, setFilter] = useState("MANUAL_REVIEW_REQUIRED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadApplications() {
      try {
        const allData = await getApproverApplications();

        setSummary(allData.summary || {});
        setApplications(allData.applications || []);
      } catch (err) {
        setError(err.message || "Unable to load applications.");
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, []);

  const decidedIds = useMemo(() => new Set(decidedApplications?.map((a) => a.application_id)), [decidedApplications]);

  const filteredApplications = useMemo(() => {
    return applications.filter(
      (app) =>
        app.review_category === filter &&
        !app.approver_decision &&
        !decidedIds.has(app.application_id)
    );
  }, [filter, applications, decidedIds]);

  const handleDelete = async (appId) => {
    if (!window.confirm("Delete this application from the queue?")) return;
    try {
      await deleteApplication(appId);
      setApplications((prev) => prev.filter((a) => a.application_id !== appId));
    } catch (err) {
      setError(err.message || "Failed to delete application.");
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return "-";
    return `$${Number(value).toLocaleString()}`;
  };

  const reviewLabel = (category) => {
    if (category === "REJECTED") return "Rejected";
    if (category === "MANUAL_REVIEW_REQUIRED") return "Manual Review Required";
    return "Approved";
  };

  const reviewColor = (category) => {
    if (category === "REJECTED") return "error";
    if (category === "MANUAL_REVIEW_REQUIRED") return "warning";
    return "success";
  };

  const formatDecision = (d) => {
    if (!d) return "";
    return d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f6f8fc",
        fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
      }}
    >
    <Box
    sx={{
        background: "linear-gradient(120deg, #001A3F 0%, #002E5D 45%, #005EB8 100%)",
        color: "white",
        px: 4,
        py: 4,
    }}
    >
    <Box
        sx={{
        maxWidth: 1200,
        mx: "auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 3,
        }}
    >
        <Box>
          <Stack direction="row" alignItems="center" spacing={0.7} onClick={backToClient} sx={{ cursor: "pointer", mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                opacity: 0.8,
                letterSpacing: "0.02em",
                "&:hover": { opacity: 1 },
              }}
            >
              UOB Credit AI
            </Typography>
          </Stack>
        <Typography
            sx={{
            fontSize: 30,
            fontWeight: 850,
            letterSpacing: "-0.03em",
            }}
        >
            Credit Approver Work Queue
        </Typography>

        <Typography sx={{ mt: 1, opacity: 0.9 }}>
            Review applications that require final credit assessment.
        </Typography>
        </Box>

        <Button
        variant="outlined"
        onClick={backToClient}
        sx={{
            borderRadius: 3,
            fontWeight: 800,
            bgcolor: "white",
            color: "#005EB8",
            borderColor: "white",
            px: 3,
            py: 1.2,
            "&:hover": {
            bgcolor: "#f8fafc",
            borderColor: "white",
            },
        }}
        >
        Back to Client Portal
        </Button>
    </Box>
    </Box>
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 4 }}>
        <Box
          sx={{
            mb: 4,
            display: "grid",
            gap: 3,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
          }}
        >
          <SplitMetricCard
            title="Total Applications"
            value={summary.total_applications || 0}
            subtitle="Applications submitted"
            accent="#005EB8"
          />
          <SplitMetricCard
            title="Auto"
            value={`${summary.auto_total_percentage || 0}%`}
            approvedCount={summary.auto_approved_count || 0}
            rejectedCount={summary.auto_rejected_count || 0}
            approvedLabel="approved"
            rejectedLabel="rejected"
            accent="#16a34a"
          />
          <SplitMetricCard
            title="Manual"
            value={`${summary.manual_total_percentage || 0}%`}
            approvedCount={summary.manual_approved_count || 0}
            rejectedCount={summary.manual_rejected_count || 0}
            approvedLabel="approved"
            rejectedLabel="rejected"
            accent="#f97316"
          />
          <SplitMetricCard
            title="Needs Further Review"
            value={`${summary.further_review_percentage || 0}%`}
            subtitle={`${summary.further_review_count || 0} require credit approver attention`}
            accent="#f59e0b"
          />
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            border: "1px solid #e5e7eb",
            boxShadow: "0 12px 28px rgba(15,23,42,.08)",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
                Applications Requiring Review
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Filter between likely rejection cases and applications requiring manual assessment.
              </Typography>
            </Box>

          </Stack>

        <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
        <Button
            color="warning"
            variant={filter === "MANUAL_REVIEW_REQUIRED" ? "contained" : "outlined"}
            onClick={() => setFilter("MANUAL_REVIEW_REQUIRED")}
            sx={{ borderRadius: 3, fontWeight: 800 }}
        >
            Manual Review Required
        </Button>

        <Box sx={{ flex: 1 }} />

        <Button
            variant="outlined"
            onClick={onViewHistory}
            sx={{ borderRadius: 3, fontWeight: 800, color: "#005EB8", borderColor: "#005EB8" }}
        >
            View History
        </Button>
        </Stack>
          {loading && (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Loading applications...</Typography>
            </Box>
          )}

          {error && (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          {!loading && !error && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Company</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>UEN</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Requested Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Review Category</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: "nowrap" }} align="right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredApplications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      No applications found for this filter.
                    </TableCell>
                  </TableRow>
                )}

                {filteredApplications.map((app) => (
                  <TableRow key={app.application_id} hover>
                    <TableCell>{app.reference_number}</TableCell>

                    <TableCell>
                      <Typography fontWeight={700}>
                        {app.company_name}
                      </Typography>
                    </TableCell>

                    <TableCell>{app.uen}</TableCell>

                    <TableCell>{formatCurrency(app.requested_quantum)}</TableCell>

                    <TableCell>
                      <Chip
                        label={reviewLabel(app.review_category)}
                        color={reviewColor(app.review_category)}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                          background: "linear-gradient(90deg, #005EB8 0%, #0072CE 100%)",
                        }}
                        onClick={() => openApplication(app)}
                      >
                        Open Review
                      </Button>
                
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>


      </Box>
    </Box>
  );
}

function SplitMetricCard({ title, value, subtitle, approvedCount, rejectedCount, approvedLabel, rejectedLabel, accent }) {
  const hasBreakdown = approvedCount != null && rejectedCount != null;
  const total = hasBreakdown ? approvedCount + rejectedCount : 0;
  const approvedPct = total > 0 ? (approvedCount / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejectedCount / total) * 100 : 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 4,
        height: "100%",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 28px rgba(15,23,42,.08)",
        borderTop: `4px solid ${accent}`,
      }}
    >
      <Typography color="text.secondary" sx={{ fontWeight: 900, fontSize: 15 }}>
        {title}
      </Typography>

      <Typography
        sx={{
          mt: 1,
          fontSize: 36,
          fontWeight: 850,
          color: accent,
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </Typography>

      {hasBreakdown && (
        <>
          <Box sx={{ mt: 1.5, mb: 1 }}>
            <Box
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: "#f1f5f9",
                overflow: "hidden",
                display: "flex",
              }}
            >
              <Box
                sx={{
                  width: `${approvedPct}%`,
                  bgcolor: "#22c55e",
                  transition: "width 0.6s ease",
                }}
              />
              <Box
                sx={{
                  width: `${rejectedPct}%`,
                  bgcolor: "#ef4444",
                  transition: "width 0.6s ease",
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#22c55e", flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, lineHeight: "10px" }}>
                {approvedCount} {approvedLabel}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#ef4444", flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, lineHeight: "10px" }}>
                {rejectedCount} {rejectedLabel}
              </Typography>
            </Box>
          </Box>
        </>
      )}

      {!hasBreakdown && subtitle && (
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}