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
    if (category === "REJECT_RECOMMENDED") return "Reject Recommended";
    if (category === "MANUAL_REVIEW_REQUIRED") return "Manual Review Required";
    return "Approved";
  };

  const reviewColor = (category) => {
    if (category === "REJECT_RECOMMENDED") return "error";
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
          <MetricCard
            title="Total Applications"
            value={summary.total_applications || 0}
            subtitle="Applications submitted"
            accent="#005EB8"
          />
          <MetricCard
            title="Auto-Approved"
            value={`${summary.approved_percentage || 0}%`}
            subtitle="Passed automated assessment"
            accent="#16a34a"
          />
          <MetricCard
            title="Needs Further Review"
            value={`${summary.further_review_percentage || 0}%`}
            subtitle="Requires credit approver attention"
            accent="#f59e0b"
          />
          <MetricCard
            title="Rejected"
            value={`${summary.rejected_percentage || 0}%`}
            subtitle="Failed to meet key credit criteria"
            accent="#dc2626"
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

        <Button
            color="error"
            variant={filter === "REJECT_RECOMMENDED" ? "contained" : "outlined"}
            onClick={() => setFilter("REJECT_RECOMMENDED")}
            sx={{ borderRadius: 3, fontWeight: 800 }}
        >
            Reject Recommended
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

function MetricCard({ title, value, subtitle, accent }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 4,
        height: "100%",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 28px rgba(15,23,42,.08)",
      }}
    >
      <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
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

      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
        {subtitle}
      </Typography>
    </Paper>
  );
}