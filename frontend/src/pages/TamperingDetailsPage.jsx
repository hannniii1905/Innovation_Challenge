import { useMemo } from "react";
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
  Stack,
  Divider,
  LinearProgress,
} from "@mui/material";

const HEURISTIC_LABELS = [
  { key: "round-number", label: "Round-number", color: "#7c3aed" },
  { key: "circular", label: "Circular transaction", color: "#0891b2" },
  { key: "timing", label: "Near period end", color: "#d97706" },
  { key: "anomalous spike", label: "Frequency anomaly", color: "#dc2626" },
];

function parseHeuristics(reason) {
  const lower = reason.toLowerCase();
  return HEURISTIC_LABELS.filter((h) => lower.includes(h.key));
}

function riskLevel(score) {
  if (score >= 0.7) return { label: "High", color: "#b91c1c", bg: "#fee2e2" };
  if (score >= 0.4) return { label: "Medium", color: "#b45309", bg: "#fef3c7" };
  return { label: "Low", color: "#ca8a04", bg: "#fef9c3" };
}

export default function TamperingDetailsPage({ bankOcr, companyName, referenceNumber, back, goHome }) {
  const credits = bankOcr?.suspicious_credits || [];
  const totalCredits = bankOcr?.total_credits || 0;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f6f8fc", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <Box sx={{ background: "linear-gradient(120deg, #991b1b 0%, #b91c1c 45%, #dc2626 100%)", color: "white", px: 4, py: 4 }}>
        <Box sx={{ maxWidth: 1250, mx: "auto" }}>
          <Stack direction="row" alignItems="center" spacing={0.7} onClick={goHome} sx={{ cursor: "pointer", mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, opacity: 0.8, letterSpacing: "0.02em", "&:hover": { opacity: 1 } }}>
              UOB Credit AI
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={back} sx={{ mb: 2, bgcolor: "white", borderColor: "white", color: "#b91c1c" }}>
            ← Back to Workbench
          </Button>
          <Typography sx={{ fontSize: 30, fontWeight: 850, letterSpacing: "-0.03em" }}>
            Tampering & Suspicious Credit Details
          </Typography>
          <Typography sx={{ mt: 1, opacity: 0.9 }}>
            {companyName} · {referenceNumber}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1250, mx: "auto", p: 4 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 12px 28px rgba(15,23,42,.08)", mb: 4 }}>
          <Stack direction="row" spacing={4} alignItems="center" flexWrap="wrap" useFlexGap>
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                Statement Integrity
              </Typography>
              <Chip
                label={bankOcr?.has_fraud_tampering ? "Tampering flagged" : "No tampering detected"}
                sx={{ mt: 0.5, fontWeight: 800, bgcolor: bankOcr?.has_fraud_tampering ? "#fee2e2" : "#dcfce7", color: bankOcr?.has_fraud_tampering ? "#b91c1c" : "#15803d" }}
              />
            </Box>
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                Suspicious Credit Volume
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 24, fontWeight: 900, color: "#b91c1c" }}>
                {bankOcr?.flagged_kiting_volume != null ? `$${Number(bankOcr.flagged_kiting_volume).toLocaleString()}` : "-"}
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                {credits.length} Credit{credits.length !== 1 ? "s" : ""} Flagged
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 24, fontWeight: 900, color: "#b91c1c" }}>
                {totalCredits > 0
                  ? `${((bankOcr?.flagged_kiting_volume / totalCredits) * 100).toFixed(1)}% of total credits`
                  : "-"}
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                Detection Engine
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 16, fontWeight: 700 }}>
                FraudDetector · 4 heuristics
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {totalCredits > 0 && (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 10px 24px rgba(15,23,42,.06)", mb: 4 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 3 }}>
              Impact on Assessed Turnover
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography fontSize={14} color="text.secondary">Total statement credits:</Typography>
                  <Typography fontWeight={800}>${Number(totalCredits).toLocaleString()}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography fontSize={14} color="text.secondary">Flagged suspicious volume: </Typography>
                  <Typography fontWeight={800} color="#b91c1c">-${Number(bankOcr?.flagged_kiting_volume || 0).toLocaleString()}</Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontSize={14} fontWeight={700}>True adjusted turnover:</Typography>
                  <Typography fontWeight={900} color="#15803d">
                    ${Number(totalCredits - (bankOcr?.flagged_kiting_volume || 0)).toLocaleString()}
                  </Typography>
                </Stack>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, ((bankOcr?.flagged_kiting_volume || 0) / totalCredits) * 100)}
                sx={{ height: 10, borderRadius: 99, bgcolor: "#e5e7eb", "& .MuiLinearProgress-bar": { bgcolor: "#dc2626" } }}
              />
              <Typography fontSize={13} color="text.secondary">
                {(bankOcr?.flagged_kiting_volume || 0) > 0
                  ? `${((bankOcr?.flagged_kiting_volume / totalCredits) * 100).toFixed(1)}% of total credits are flagged as potentially inflated — this volume is subtracted from assessed turnover.`
                  : "No credit volume was flagged."}
              </Typography>
            </Stack>
          </Paper>
        )}

        {credits.length > 0 ? (
          <Stack spacing={3}>
            {credits.map((sc, i) => (
              <SuspiciousCreditCard key={i} credit={sc} index={i + 1} totalCredits={totalCredits} />
            ))}
          </Stack>
        ) : (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", textAlign: "center" }}>
            <Typography>No suspicious credits were flagged by the fraud detection engine.</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

function formatCurrency(value) {
  if (!value && value !== 0) return "-";
  return `$${Number(value).toLocaleString()}`;
}

function SuspiciousCreditCard({ credit, index, totalCredits }) {
  const risk = riskLevel(credit.risk_score);
  const heuristics = parseHeuristics(credit.reason);
  const flaggedPct = totalCredits > 0 ? ((credit.amount / totalCredits) * 100).toFixed(1) : null;

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 10px 24px rgba(15,23,42,.06)" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
            #{index} — {credit.date}
          </Typography>
          {credit.transaction_type && (
            <Chip
              label={credit.transaction_type.toUpperCase()}
              size="small"
              sx={{ mt: 0.5, fontWeight: 700, bgcolor: "#dbeafe", color: "#1d4ed8", fontSize: 11 }}
            />
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`${credit.risk_score} risk score`}
            size="small"
            sx={{ fontWeight: 800, bgcolor: risk.bg, color: risk.color }}
          />
          <Chip
            label={risk.label}
            size="small"
            sx={{ fontWeight: 800, bgcolor: risk.bg, color: risk.color, border: `2px solid ${risk.color}` }}
          />
        </Stack>
      </Stack>

      <Table size="small" sx={{ mb: 2 }}>
        <TableBody>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 160 }}>Description</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{credit.description}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Amount</TableCell>
            <TableCell>
              <Typography fontWeight={900} color="#b91c1c" sx={{ fontSize: 18 }}>
                {formatCurrency(credit.amount)}
              </Typography>
              {flaggedPct && (
                <Typography fontSize={12} color="text.secondary">
                  {flaggedPct}% of total statement credits
                </Typography>
              )}
            </TableCell>
          </TableRow>
          {credit.raw_text && (
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Raw OCR Line</TableCell>
              <TableCell>
                <Typography fontSize={13} sx={{ fontFamily: "monospace", bgcolor: "#1e293b", color: "#e2e8f0", p: 1.5, borderRadius: 1.5 }}>
                  {credit.raw_text}
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Divider sx={{ mb: 2 }} />

      <Typography fontSize={13} fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
        Triggered Heuristics ({heuristics.length})
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {HEURISTIC_LABELS.map((h) => {
          const triggered = heuristics.some((m) => m.key === h.key);
          return (
            <Chip
              key={h.key}
              label={h.label}
              size="small"
              variant={triggered ? "filled" : "outlined"}
              sx={{
                fontWeight: 700,
                bgcolor: triggered ? h.color : "transparent",
                color: triggered ? "white" : h.color,
                borderColor: h.color,
                opacity: triggered ? 1 : 0.4,
              }}
            />
          );
        })}
      </Stack>

      <Typography fontSize={13} fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
        Detection Details
      </Typography>
      <Stack spacing={0.5}>
        {credit.reason.split(";").map((part, j) => {
          const trimmed = part.trim();
          const matched = HEURISTIC_LABELS.find((h) => trimmed.toLowerCase().includes(h.key));
          return (
            <Box
              key={j}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: matched ? `${matched.color}08` : "#f8fafc",
                borderLeft: matched ? `3px solid ${matched.color}` : "3px solid #cbd5e1",
              }}
            >
              <Typography fontSize={13} color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {trimmed}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
