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
} from "@mui/material";

export default function LitigationDetailsPage({ litigation, companyName, referenceNumber, back, goHome }) {
  const charges = litigation?.charges || [];
  const hasIssues = !litigation?.passed;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f6f8fc", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <Box sx={{ background: "linear-gradient(120deg, #92400e 0%, #b45309 45%, #d97706 100%)", color: "white", px: 4, py: 4 }}>
        <Box sx={{ maxWidth: 1250, mx: "auto" }}>
          <Stack direction="row" alignItems="center" spacing={0.7} onClick={goHome} sx={{ cursor: "pointer", mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, opacity: 0.8, letterSpacing: "0.02em", "&:hover": { opacity: 1 } }}>
              UOB Credit AI
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={back} sx={{ mb: 2, bgcolor: "white", borderColor: "white", color: "#b45309" }}>
            ← Back to Workbench
          </Button>
          <Typography sx={{ fontSize: 30, fontWeight: 850, letterSpacing: "-0.03em" }}>
            Litigation & Corporate Charge Details
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
                Litigation Status
              </Typography>
              <Chip
                label={hasIssues ? "Issues found" : "Clear"}
                sx={{ mt: 0.5, fontWeight: 800, bgcolor: hasIssues ? "#fef3c7" : "#dcfce7", color: hasIssues ? "#b45309" : "#15803d" }}
              />
            </Box>
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                Outstanding Cases / Charges
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 24, fontWeight: 900, color: hasIssues ? "#b45309" : "#15803d" }}>
                {litigation?.count ?? 0}
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                Corporate Charges on File
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 24, fontWeight: 900, color: charges.length > 0 ? "#b45309" : "#15803d" }}>
                {charges.length}
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                Adverse Bureau Records
              </Typography>
              <Chip
                label={litigation?.has_adverse_bureau_records ? "Yes" : "No"}
                size="small"
                sx={{ mt: 0.5, fontWeight: 800, bgcolor: litigation?.has_adverse_bureau_records ? "#fee2e2" : "#dcfce7", color: litigation?.has_adverse_bureau_records ? "#b91c1c" : "#15803d" }}
              />
            </Box>
          </Stack>
        </Paper>

        {charges.length > 0 ? (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 12px 28px rgba(15,23,42,.08)" }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 3 }}>
              Corporate Charges ({charges.length})
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Charge Number</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Bank</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Currency</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Creation Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {charges.map((c, i) => (
                  <TableRow key={c.charge_number || i} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{c.charge_number || "—"}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{c.chargee_bank || "—"}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#b91c1c" }}>
                      {c.charge_amount != null ? `$${Number(c.charge_amount).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>{c.currency || "SGD"}</TableCell>
                    <TableCell>
                      <Chip
                        label={c.status || "—"}
                        size="small"
                        sx={{ fontWeight: 700, bgcolor: c.status === "OPEN" ? "#fef3c7" : "#dcfce7", color: c.status === "OPEN" ? "#b45309" : "#15803d" }}
                      />
                    </TableCell>
                    <TableCell>{c.creation_date || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ) : (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 12px 28px rgba(15,23,42,.08)", textAlign: "center" }}>
            <Typography>No corporate charges or litigation records found for this entity.</Typography>
          </Paper>
        )}

        {litigation?.high_risk && (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #fecaca", bgcolor: "#fef2f2", mt: 3 }}>
            <Typography fontWeight={800} color="#b91c1c" sx={{ mb: 1 }}>
              Impact on Credit Assessment
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Outstanding litigation or adverse bureau records increase the assessed probability of default.
              This may result in a higher PD score, a reduced approved limit, or a decline recommendation
              depending on the severity and number of outstanding charges.
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
