import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
} from "@mui/material";

export default function LightKycPanel({ lightKyc, aml }) {
  const fallbackChecks = [
    {
      key: "aml",
      label: "AML",
      passed: aml?.passed ?? true,
      reason: aml?.reason || "",
      description:
        "Company and keymen screened against AML, sanctions and adverse media lists.",
    },
    {
      key: "bank_wide_cif_blacklist",
      label: "Bank-wide CIF Blacklist",
      passed: true,
      reason: "",
      description:
        "Applicant UEN / CIF checked against internal bank-wide blacklist records.",
    },
    {
      key: "industry_blacklist",
      label: "Industry Blacklist",
      passed: true,
      reason: "",
      description: "Business activity checked against excluded industries.",
    },
    {
      key: "on_us_off_us",
      label: "On-us / Off-us Check",
      passed: true,
      reason: "",
      description:
        "Checks existing UOB conduct and external/off-us banking exposure indicators.",
    },
  ];

  const checks =
    Array.isArray(lightKyc?.checks) && lightKyc.checks.length > 0
      ? lightKyc.checks
      : fallbackChecks;

  const normalizedChecks = checks.map((check) => ({
    ...check,
    passed: check.passed !== false,
    reason: check.reason || check.failReason || "",
  }));

  const failedChecks = normalizedChecks.filter((check) => !check.passed);

  const allPassed =
    lightKyc?.passed !== undefined
      ? lightKyc.passed
      : failedChecks.length === 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3.5,
        borderRadius: 4,
        border: "1px solid #e5e7eb",
        boxShadow: "0 10px 24px rgba(15,23,42,.06)",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
            Light KYC Screening
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: 13, lineHeight: 1.6 }}
          >
            Four-point preliminary screening across AML, CIF blacklist, industry
            eligibility, and on-us/off-us exposure.
          </Typography>
        </Box>

        <Chip
          label={allPassed ? "Clear" : "Review Required"}
          size="small"
          sx={{
            fontWeight: 900,
            bgcolor: allPassed ? "#ecfdf5" : "#fee2e2",
            color: allPassed ? "#047857" : "#b91c1c",
            border: `1px solid ${allPassed ? "#bbf7d0" : "#fecaca"}`,
          }}
        />
      </Stack>

      <Stack spacing={1.2}>
        {normalizedChecks.map((check) => {
          const passed = check.passed;

          return (
            <Box
              key={check.key || check.label}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: passed ? "#ffffff" : "#fff7f7",
                border: `1.5px solid ${passed ? "#e5e7eb" : "#fca5a5"}`,
                boxShadow: passed
                  ? "none"
                  : "0 10px 22px rgba(185,28,28,.08)",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "flex-start" }}
                spacing={1.5}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: passed ? "#0f172a" : "#991b1b",
                      }}
                    >
                      {check.label}
                    </Typography>
                  </Stack>

                  <Typography
                    fontSize={13}
                    color="text.secondary"
                    sx={{ lineHeight: 1.55 }}
                  >
                    {check.description}
                  </Typography>

                  {!passed && (
                    <Box
                      sx={{
                        mt: 1.2,
                        pl: 1.4,
                        borderLeft: "3px solid #dc2626",
                      }}
                    >
                      <Typography
                        fontSize={13}
                        sx={{
                          color: "#b91c1c",
                          fontWeight: 800,
                          lineHeight: 1.55,
                        }}
                      >
                        {check.reason || "Review required."}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Chip
                  label={passed ? "Clear" : "Review"}
                  size="small"
                  sx={{
                    minWidth: 72,
                    fontWeight: 900,
                    bgcolor: passed ? "#ecfdf5" : "#fee2e2",
                    color: passed ? "#047857" : "#b91c1c",
                    border: `1px solid ${passed ? "#bbf7d0" : "#fecaca"}`,
                  }}
                />
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}