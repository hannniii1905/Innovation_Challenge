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
} from "@mui/material";
import { getApproverApplications, deleteApplication } from "../api/client";

export default function CreditApproverHistory({ decidedApplications, openApplication, goBack }) {
  const [historyApplications, setHistoryApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("REJECTED");

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getApproverApplications();
        setHistoryApplications(data.applications || []);
      } catch (err) {
        setError(err.message || "Unable to load history.");
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const allHistory = useMemo(() => {
    const map = new Map();
    for (const app of historyApplications) {
      map.set(app.application_id, { ...app, approverDecision: app.approver_decision });
    }
    for (const app of decidedApplications || []) {
      map.set(app.application_id, app);
    }
    return Array.from(map.values());
  }, [historyApplications, decidedApplications]);

  const filteredHistory = useMemo(() => {
    return allHistory.filter((app) => {
      if (tab === "REJECTED") return app.approverDecision === "REJECTED";
      if (tab === "AUTO_REJECTED") return app.system_decision === "REJECTED" && !app.approverDecision;
      if (tab === "APPROVED") return app.approverDecision === "APPROVED";
      if (tab === "FOR_REVIEW") return app.approverDecision === "SUBJECT TO APPROVAL";
      return false;
    });
  }, [allHistory, tab]);

  const handleDelete = async (appId) => {
    if (!window.confirm("Delete this application from the queue?")) return;
    try {
      await deleteApplication(appId);
      setHistoryApplications((prev) => prev.filter((a) => a.application_id !== appId));
    } catch (err) {
      setError(err.message || "Failed to delete application.");
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return "-";
    return `$${Number(value).toLocaleString()}`;
  };

  const formatDecision = (d) => {
    if (!d) return "";
    if (d === "SUBJECT TO APPROVAL") return "Subject to Approval";
    return d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const decisionColor = (d) => {
    if (d === "APPROVED") return "success";
    if (d === "REJECTED") return "error";
    return "warning";
  };

  const tabs = [
    { key: "REJECTED", label: "Rejected", color: "error" },
    { key: "AUTO_REJECTED", label: "Auto-Rejected", color: "error" },
    { key: "APPROVED", label: "Approved", color: "success" },
    { key: "FOR_REVIEW", label: "For review", color: "warning" },
  ];

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
            <Stack direction="row" alignItems="center" spacing={0.7} onClick={goBack} sx={{ cursor: "pointer", mb: 0.5 }}>
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
              History
            </Typography>
            <Typography sx={{ mt: 1, opacity: 0.9 }}>
              Review all past approved, rejected, and subject-to-approval applications.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={goBack}
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
            Back to Work Queue
          </Button>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", p: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            border: "1px solid #e5e7eb",
            boxShadow: "0 12px 28px rgba(15,23,42,.08)",
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
            {tabs.map((t) => (
              <Button
                key={t.key}
                color={t.color}
                variant={tab === t.key ? "contained" : "outlined"}
                onClick={() => setTab(t.key)}
                sx={{ borderRadius: 3, fontWeight: 800 }}
              >
                {t.label}
              </Button>
            ))}
          </Stack>

          {loading && (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Loading history...</Typography>
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
                  <TableCell sx={{ fontWeight: 800 }}>Decision</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      No {tab === "FOR_REVIEW" ? "subject-to-approval" : tab === "AUTO_REJECTED" ? "auto-rejected" : tab.toLowerCase()} applications found.
                    </TableCell>
                  </TableRow>
                )}
                {filteredHistory.map((app) => (
                  <TableRow key={app.application_id} hover>
                    <TableCell>{app.reference_number}</TableCell>
                    <TableCell>
                      <Typography fontWeight={700}>{app.company_name}</Typography>
                    </TableCell>
                    <TableCell>{app.uen}</TableCell>
                    <TableCell>{formatCurrency(app.requested_quantum)}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          !app.approverDecision && app.system_decision === "REJECTED"
                            ? "Auto-Rejected"
                            : formatDecision(app.approverDecision)
                        }
                        color={
                          !app.approverDecision && app.system_decision === "REJECTED"
                            ? "error"
                            : decisionColor(app.approverDecision)
                        }
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
                      <Button
                        variant="contained"
                        size="small"
                        color="error"
                        sx={{ ml: 1, borderRadius: 2, fontWeight: 700 }}
                        onClick={() => handleDelete(app.application_id)}
                      >
                        Delete
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
