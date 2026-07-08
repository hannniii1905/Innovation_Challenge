import {
  Card,
  CardContent,
  Typography,
  Slider,
  Box,
  Button,
  Stack,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormHelperText,
} from "@mui/material";
import { useMemo, useEffect } from "react";

// UOB-style palette
const NAVY = "#0a1f3c";
const UOB_BLUE = "#1d4ed8";

const MIN_AMOUNT = 30000;
const MAX_AMOUNT = 800000;
const AMOUNT_STEP = 10000;
const INTEREST_RATE = 7.75; // indicative rate, matches UOB calculator

const TENURES = [
  { label: "1 year", months: 12 },
  { label: "2 years", months: 24 },
  { label: "3 years", months: 36 },
  { label: "4 years", months: 48 },
  { label: "5 years", months: 60 },
];

const sgd = (n, opts = {}) =>
  `SGD ${Number(n || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
    ...opts,
  })}`;

export default function LoanCalculator({ application, setApplication }) {
  const monthly = useMemo(() => {
    const P = Number(application.loanAmount || 0);
    const r = INTEREST_RATE / 100 / 12;
    const n = Number(application.tenure || 0);
    if (!P || !n) return 0;
    return (P * r) / (1 - Math.pow(1 + r, -n));
  }, [application.loanAmount, application.tenure]);

  useEffect(() => {
    setApplication((prev) => ({
      ...prev,
      interestRate: INTEREST_RATE,
      monthlyInstallment: Number(monthly.toFixed(2)),
    }));
  }, [monthly, setApplication]);

  const setAmount = (value) => {
    let v = Number(value);
    if (Number.isNaN(v)) v = MIN_AMOUNT;
    v = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, v));
    setApplication((prev) => ({ ...prev, loanAmount: v }));
  };

  const amount = Math.min(
    MAX_AMOUNT,
    Math.max(MIN_AMOUNT, Number(application.loanAmount) || MIN_AMOUNT)
  );

  return (
    <Card
      elevation={0}
      sx={{
        mb: 4,
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: "0 18px 40px rgba(15,23,42,.10)",
      }}
    >
      <CardContent sx={{ p: 0 }}>
        {/* Navy banner */}
        <Box
          sx={{
            position: "relative",
            background: `linear-gradient(120deg, ${NAVY} 0%, #002E5D 60%, ${UOB_BLUE} 140%)`,
            color: "white",
            px: { xs: 4, md: 6 },
            pt: 5,
            pb: 7,
            minHeight: { xs: 150, md: 175 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Subtle decorative circles */}
          <Box
            sx={{
              position: "absolute",
              right: -60,
              top: -70,
              width: 220,
              height: 220,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.05)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              right: 70,
              bottom: -80,
              width: 160,
              height: 160,
              borderRadius: "50%",
              bgcolor: "rgba(0,163,224,0.18)",
            }}
          />

          <Typography
            sx={{
              position: "relative",
              fontSize: { xs: 22, md: 26 },
              fontWeight: 800,
              lineHeight: 1.35,
              maxWidth: 620,
              letterSpacing: "-0.01em",
            }}
          >
            Let's begin! Enter a loan amount, and enjoy a speedy application by
            applying with Singpass.
          </Typography>
        </Box>

        {/* Overlapping white card body */}
        <Box
          sx={{
            bgcolor: "white",
            mx: { xs: 2, md: 4 },
            mt: -4,
            mb: 3,
            borderRadius: 4,
            boxShadow: "0 12px 30px rgba(15,23,42,.10)",
            px: { xs: 3, md: 7 },
            pt: { xs: 7, md: 8 },
            pb: { xs: 5, md: 6 },
            textAlign: "center",
          }}
        >
          {/* Amount */}
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
            Indicate your desired loan amount
          </Typography>

          <Typography
            sx={{
              mt: 1.5,
              fontSize: { xs: 34, md: 44 },
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
              borderBottom: "2px dashed #cbd5e1",
              display: "inline-block",
              pb: 1,
              px: 2,
            }}
          >
            {sgd(amount)}
          </Typography>

          <Box sx={{ mt: 3, px: { xs: 0, md: 2 } }}>
            <Slider
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step={AMOUNT_STEP}
              value={amount}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => sgd(v)}
              onChange={(e, value) => setAmount(value)}
              sx={{
                color: UOB_BLUE,
                height: 6,
                "& .MuiSlider-thumb": {
                  width: 22,
                  height: 22,
                  bgcolor: UOB_BLUE,
                  border: "3px solid #fff",
                  boxShadow: "0 2px 8px rgba(29,78,216,.4)",
                },
                "& .MuiSlider-rail": { bgcolor: "#e2e8f0", opacity: 1 },
              }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
              <Typography fontSize={13} color="text.secondary">
                {sgd(MIN_AMOUNT)}
              </Typography>
              <Typography fontSize={13} color="text.secondary">
                {sgd(MAX_AMOUNT)}
              </Typography>
            </Box>
          </Box>

          {/* Tenure pills */}
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mt: 6, mb: 2.5 }}>
            Choose your loan tenure
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 1.5,
            }}
          >
            {TENURES.map((t) => {
              const selected = application.tenure === t.months;
              return (
                <Button
                  key={t.months}
                  onClick={() =>
                    setApplication((prev) => ({ ...prev, tenure: t.months }))
                  }
                  disableElevation
                  sx={{
                    minWidth: 96,
                    px: 3,
                    py: 1.25,
                    borderRadius: 99,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: 15,
                    bgcolor: selected ? UOB_BLUE : "white",
                    color: selected ? "white" : "#334155",
                    border: `1.5px solid ${selected ? UOB_BLUE : "#cbd5e1"}`,
                    "&:hover": {
                      bgcolor: selected ? "#1e40af" : "#f1f5f9",
                      border: `1.5px solid ${selected ? "#1e40af" : "#94a3b8"}`,
                    },
                  }}
                >
                  {t.label}
                </Button>
              );
            })}
          </Box>

          {/* Loan Purpose */}
          <Box sx={{ mt: 6, mb: 1 }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 2 }}>
              Loan Purpose <Box component="span" sx={{ color: "#ef4444" }}>*</Box>
            </Typography>
            <FormControl required>
              <RadioGroup
                value={application.loanPurpose || ""}
                onChange={(e) =>
                  setApplication((prev) => ({
                    ...prev,
                    loanPurpose: e.target.value,
                  }))
                }
                sx={{ display: "flex", flexDirection: "row", gap: 2, justifyContent: "center" }}
              >
                <FormControlLabel
                  value="Working Capital"
                  control={<Radio />}
                  label="Working Capital Requirements"
                  sx={{
                    border: "1.5px solid",
                    borderColor: application.loanPurpose === "Working Capital" ? "#1d4ed8" : "#cbd5e1",
                    borderRadius: 3,
                    px: 3,
                    py: 1.5,
                    m: 0,
                    width: 260,
                  }}
                />
                <FormControlLabel
                  value="Business Expansion"
                  control={<Radio />}
                  label="Business Expansion Requirements"
                  sx={{
                    border: "1.5px solid",
                    borderColor: application.loanPurpose === "Business Expansion" ? "#1d4ed8" : "#cbd5e1",
                    borderRadius: 3,
                    px: 3,
                    py: 1.5,
                    m: 0,
                    width: 260,
                  }}
                />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* Divider + instalment */}
          <Box sx={{ borderTop: "1px solid #e5e7eb", mt: 6, pt: 5 }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              Your calculated monthly instalment
            </Typography>
            <Typography fontSize={13} color="text.secondary" sx={{ mt: 0.5 }}>
              based on an indicative interest rate of {INTEREST_RATE}% p.a
            </Typography>

            <Typography
              sx={{
                mt: 2,
                fontSize: { xs: 34, md: 40 },
                fontWeight: 900,
                color: UOB_BLUE,
                letterSpacing: "-0.02em",
              }}
            >
              {sgd(monthly, { minimumFractionDigits: 0 })}
            </Typography>

            <Typography sx={{ mt: 2, fontSize: 11.5, color: "#94a3b8", lineHeight: 1.5, maxWidth: 560, mx: "auto" }}>
              This is an indicative estimate only and not a final offer. Actual
              rates and repayments are subject to credit assessment and approval.
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
