import {
  Card,
  CardContent,
  Typography,
  Slider,
  Grid,
  TextField,
  Box,
  Stack,
  Divider,
} from "@mui/material";
import { useMemo, useEffect } from "react";

export default function LoanCalculator({ application, setApplication }) {
  const monthly = useMemo(() => {
    const P = Number(application.loanAmount || 0);
    const annualRate = Number(application.interestRate || 0) / 100;
    const r = annualRate / 12;
    const n = Number(application.tenure || 0);

    if (!P || !n) return 0;
    if (r === 0) return P / n;

    return (P * r) / (1 - Math.pow(1 + r, -n));
  }, [application.loanAmount, application.tenure, application.interestRate]);

  useEffect(() => {
    setApplication((prev) => ({
      ...prev,
      monthlyInstallment: Number(monthly.toFixed(2)),
    }));
  }, [monthly, setApplication]);

  const SummaryRow = ({ label, value }) => (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        columnGap: 3,
        alignItems: "center",
        py: 0.8,
      }}
    >
    <Typography color="text.secondary">
      {label}
    </Typography>

    <Typography fontWeight={700} sx={{ textAlign: "right" }}>
      {value}
    </Typography>
  </Box>
  );

  return (
    <Card
      elevation={0}
      sx={{
        mb: 4,
        borderRadius: 5,
        border: "1px solid #e5e7eb",
        boxShadow: "0 18px 40px rgba(15,23,42,.07)",
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            px: 4,
            py: 3,
            borderBottom: "1px solid #e5e7eb",
            background:
              "linear-gradient(90deg, rgba(238,242,255,0.9), rgba(255,255,255,0.9))",
          }}
        >
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
            Loan Details
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.8, fontSize: 14 }}>
            Configure the requested facility and estimated repayment profile.
          </Typography>
        </Box>

        <Grid container>
          <Grid item xs={12} md={7}>
            <Box sx={{ p: 4 }}>
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    columnGap: 3,
                    alignItems: "center",
                    mb: 1.5,
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                    Requested Loan Amount
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 800,
                      color: "#4f46e5",
                      bgcolor: "#eef2ff",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                    }}
                  >
                    ${Number(application.loanAmount).toLocaleString()}
                  </Typography>
                </Box>

                <Slider
                  min={10000}
                  max={200000}
                  step={10000}
                  marks={[
                    { value: 10000, label: "10k" },
                    { value: 50000, label: "50k" },
                    { value: 100000, label: "100k" },
                    { value: 150000, label: "150k" },
                    { value: 200000, label: "200k" },
                  ]}
                  value={application.loanAmount}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `$${v.toLocaleString()}`}
                  onChange={(e, value) =>
                    setApplication((prev) => ({
                      ...prev,
                      loanAmount: value,
                    }))
                  }
                />
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  columnGap: 3,
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                  Loan Tenure
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 800,
                    color: "#4f46e5",
                    bgcolor: "#eef2ff",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                  }}
                >
                  {application.tenure} months
                </Typography>
              

                <Slider
                  min={12}
                  max={60}
                  step={12}
                  marks={[
                    { value: 12, label: "12" },
                    { value: 24, label: "24" },
                    { value: 36, label: "36" },
                    { value: 48, label: "48" },
                    { value: 60, label: "60" },
                  ]}
                  value={application.tenure}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v} months`}
                  onChange={(e, value) =>
                    setApplication((prev) => ({
                      ...prev,
                      tenure: value,
                    }))
                  }
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box
              sx={{
                height: "100%",
                p: 4,
                bgcolor: "#f8fafc",
                borderLeft: { md: "1px solid #e5e7eb", xs: "none" },
                borderTop: { xs: "1px solid #e5e7eb", md: "none" },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                Estimated Monthly Instalment
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  fontSize: 44,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#2563eb",
                  lineHeight: 1,
                }}
              >
                ${monthly.toFixed(2)}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={1.6}>
                <SummaryRow
                  label="Principal Amount"
                  value={`$${Number(application.loanAmount).toLocaleString()}`}
                />

                <SummaryRow
                  label="Tenure"
                  value={`${application.tenure} months`}
                />

                <SummaryRow
                  label="Interest Rate"
                  value={`${application.interestRate ?? 10.88}% p.a.`}
                />
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}