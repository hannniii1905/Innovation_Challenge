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
} from "@mui/material";

import LightKycPanel from "../components/LightKycPanel";

export default function RiskFlagDetailsPage({ flag, application, back, goHome }) {
  const uw = application?.underwriting || {};
  const bank = uw.bank_ocr || {};
  const aml = uw.aml || {};
  const lightKyc = uw.light_kyc || {};
  const pgs = application?.personal_guarantors || [];
  const pgCoverage = Number(application?.pg_coverage ?? 0);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f6f8fc", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <Box sx={{ background: "linear-gradient(120deg, #1e3a5f 0%, #2d5a87 45%, #3b82f6 100%)", color: "white", px: 4, py: 4 }}>
        <Box sx={{ maxWidth: 1250, mx: "auto" }}>
          <Stack direction="row" alignItems="center" spacing={0.7} onClick={goHome} sx={{ cursor: "pointer", mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, opacity: 0.8, letterSpacing: "0.02em", "&:hover": { opacity: 1 } }}>
              UOB Credit AI
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={back} sx={{ mb: 2, bgcolor: "white", borderColor: "white", color: "#1e3a5f" }}>
            ← Back to Workbench
          </Button>
          <Typography sx={{ fontSize: 30, fontWeight: 850, letterSpacing: "-0.03em" }}>
            Risk Flag Details
          </Typography>
          <Typography sx={{ mt: 1, opacity: 0.9 }}>
            {application?.company_name} · {application?.reference_number}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1250, mx: "auto", p: 4 }}>
        {!(
          flag === "Light KYC review required" ||
          flag?.startsWith("Light KYC:")
        ) && (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              border: "1px solid #e5e7eb",
              boxShadow: "0 12px 28px rgba(15,23,42,.08)",
              mb: 4,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{flag}</Typography>
              <Chip
                label="Risk Flag"
                size="small"
                sx={{
                  fontWeight: 800,
                  bgcolor: "#fee2e2",
                  color: "#b91c1c",
                }}
              />
            </Stack>
          </Paper>
        )}

        {flag === "Credit-kiting patterns detected" && (
          <KitingSection bank={bank} />
        )}

        {(flag === "PG shareholding coverage below 50%" || flag === "A personal guarantor is 70 or older") && (
          <PGSection pgs={pgs} pgCoverage={pgCoverage} flag={flag} />
        )}

        {(flag === "Light KYC review required" || flag?.startsWith("Light KYC:")) && (
          <LightKycPanel lightKyc={lightKyc} aml={aml} />
        )}

        {![
          "Credit-kiting patterns detected",
          "PG shareholding coverage below 50%",
          "A personal guarantor is 70 or older",
          "Light KYC review required",
        ].includes(flag) && !flag?.startsWith("Light KYC:") && (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", textAlign: "center" }}>
            <Typography color="text.secondary">
              This risk flag was raised by the automated assessment engine. Refer to the relevant evidence section in the workbench for detailed context.
            </Typography>
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

function KitingSection({ bank }) {
  const credits = bank.suspicious_credits || [];

  return (
    <>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 10px 24px rgba(15,23,42,.06)", mb: 3 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 3 }}>
          Credit-Kiting & Suspicious Credit Volume
        </Typography>
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography color="text.secondary" fontSize={13} fontWeight={700}>
              Flagged Volume
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#b91c1c" }}>
              {formatCurrency(bank.flagged_kiting_volume || 0)}
            </Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" fontSize={13} fontWeight={700}>
              Suspicious Credits Flagged
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#b91c1c" }}>
              {credits.length}
            </Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" fontSize={13} fontWeight={700}>
              Total Statement Credits
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 900 }}>
              {formatCurrency(bank.total_credits || 0)}
            </Typography>
          </Box>
          {bank.total_credits > 0 && (
            <Box>
              <Typography color="text.secondary" fontSize={13} fontWeight={700}>
                % of Total
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#b91c1c" }}>
                {((bank.flagged_kiting_volume / bank.total_credits) * 100).toFixed(1)}%
              </Typography>
            </Box>
          )}
        </Stack>
        <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "#fef2f2", border: "1px solid #fecaca" }}>
          <Typography fontSize={13} color="#b91c1c" fontWeight={700}>
            Kiting patterns artificially inflate the apparent turnover. Flagged volume is subtracted from total credits to derive the true adjusted turnover for assessment purposes.
          </Typography>
        </Box>
      </Paper>

      {credits.length > 0 && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 10px 24px rgba(15,23,42,.06)" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 3 }}>
            Flagged Transactions
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Risk Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {credits.map((sc, i) => (
                <TableRow key={i} hover>
                  <TableCell>{sc.date}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{sc.description}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#b91c1c" }}>{formatCurrency(sc.amount)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={sc.risk_score}
                      sx={{ fontWeight: 800, bgcolor: sc.risk_score >= 0.7 ? "#fee2e2" : "#fef3c7", color: sc.risk_score >= 0.7 ? "#b91c1c" : "#b45309" }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </>
  );
}

function PGSection({ pgs, pgCoverage, flag }) {
  const isAgeFlag = flag === "A personal guarantor is 70 or older";

  return (
    <>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 10px 24px rgba(15,23,42,.06)", mb: 3 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 3 }}>
          Personal Guarantee Assessment
        </Typography>
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography color="text.secondary" fontSize={13} fontWeight={700}>
              Shareholding Coverage
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 900, color: pgCoverage >= 50 ? "#15803d" : "#b91c1c" }}>
              {pgCoverage}%
            </Typography>
            <Chip
              size="small"
              label={pgCoverage >= 50 ? "Meets 50% minimum" : "Below 50% minimum"}
              sx={{ mt: 0.5, fontWeight: 700, bgcolor: pgCoverage >= 50 ? "#dcfce7" : "#fee2e2", color: pgCoverage >= 50 ? "#15803d" : "#b91c1c" }}
            />
          </Box>
          <Box>
            <Typography color="text.secondary" fontSize={13} fontWeight={700}>
              Personal Guarantors
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 900 }}>
              {pgs.length}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {pgs.length > 0 && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "0 10px 24px rgba(15,23,42,.06)" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 3 }}>
            Guarantor Details
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Shareholding</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Verification</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Age</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Age &lt; 70</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>IRAS income</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>CBS consent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pgs.map((p, idx) => {
                const methodLabel =
                  p.method === "MANUAL"
                    ? "Manual"
                    : p.method === "SINGPASS_REMOTE"
                      ? "Singpass (remote)"
                      : p.method === "SINGPASS"
                        ? "Singpass"
                        : null;
                return (
                  <TableRow key={p.name || idx} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                    <TableCell>{p.shareholding != null ? `${p.shareholding}%` : "—"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.verified ? methodLabel || "Verified" : "Pending"}
                        sx={{
                          fontWeight: 700,
                          bgcolor: p.verified ? "#dcfce7" : "#fef3c7",
                          color: p.verified ? "#15803d" : "#b45309",
                        }}
                      />
                    </TableCell>
                    <TableCell>{p.age != null ? p.age : "—"}</TableCell>
                    <TableCell>
                      {p.age == null ? (
                        "—"
                      ) : (
                        <Chip
                          size="small"
                          label={p.age < 70 ? "Yes" : "No"}
                          sx={{ fontWeight: 700, bgcolor: p.age < 70 ? "#dcfce7" : "#fee2e2", color: p.age < 70 ? "#15803d" : "#b91c1c" }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {p.irasIncome != null ? `S$${Number(p.irasIncome).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.cbsConsent ? "Granted" : "Pending"}
                        sx={{
                          fontWeight: 700,
                          bgcolor: p.cbsConsent ? "#dcfce7" : "#fef3c7",
                          color: p.cbsConsent ? "#15803d" : "#b45309",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {isAgeFlag && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "#fef2f2", border: "1px solid #fecaca" }}>
              <Typography fontSize={13} color="#b91c1c" fontWeight={700}>
                One or more guarantors are aged 70 or older. This increases the assessed probability of default as the risk of incapacity or mortality is higher.
              </Typography>
            </Box>
          )}
          {!isAgeFlag && pgCoverage < 50 && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "#fef2f2", border: "1px solid #fecaca" }}>
              <Typography fontSize={13} color="#b91c1c" fontWeight={700}>
                The combined shareholding of selected personal guarantors is below the 50% minimum threshold. A PG coverage shortfall increases risk and may result in a higher PD or reduced limit.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </>
  );
}
