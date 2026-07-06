import { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Stack,
  Chip,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
} from "@mui/material";
import PortalShell from "../components/PortalShell";
import { uob } from "../theme";

function ageFromDob(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// Common bank policy: guarantor's age at loan maturity should not exceed this.
const PG_MAX_AGE_AT_MATURITY = 70;
// Selected personal guarantors must collectively hold at least this much equity.
const PG_MIN_COVERAGE = 50;

function Field({ label, value }) {
  return (
    <Box sx={{ py: 1 }}>
      <Typography fontSize={12} color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <Typography fontWeight={700} sx={{ mt: 0.3 }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, source, children }) {
  return (
    <Paper sx={{ p: 3.5, borderRadius: 4, boxShadow: "0 10px 24px rgba(15,23,42,.06)" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography fontWeight={900} sx={{ color: uob.ink }}>
          {title}
        </Typography>
        <Chip
          size="small"
          label={source}
          sx={{ bgcolor: uob.tintBlue, color: uob.blue, fontWeight: 800 }}
        />
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
      {children}
    </Paper>
  );
}

export default function MyInfoReview({ application, setApplication, next, back }) {
  const profile = application.profile || {};
  const business = profile.businessInfo || {};
  const keymen = profile.keymen || [];
  const viaSingpass = application.authMethod === "SINGPASS_MYINFO";
  const tenureYears = Math.ceil(Number(application.tenure || 0) / 12);

  // Rank keymen by shareholding, high to low.
  const rankedKeymen = useMemo(
    () => [...keymen].sort((a, b) => (b.shareholding || 0) - (a.shareholding || 0)),
    [keymen]
  );

  // Personal guarantors: default to ALL keymen selected.
  const [selected, setSelected] = useState(() =>
    new Set(rankedKeymen.map((k) => k.name))
  );

  const toggle = (name) => {
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(name)) nextSet.delete(name);
      else nextSet.add(name);
      return nextSet;
    });
  };

  const coverage = rankedKeymen
    .filter((k) => selected.has(k.name))
    .reduce((sum, k) => sum + (k.shareholding || 0), 0);

  const meetsCoverage = coverage >= PG_MIN_COVERAGE;

  // The logged-in person (MyInfo Person) — the first director for a keyman login.
  const person = viaSingpass ? rankedKeymen[0] : null;
  const personAge = person ? ageFromDob(person.dob) : null;

  const handleContinue = () => {
    if (!meetsCoverage) return;
    const guarantors = rankedKeymen
      .filter((k) => selected.has(k.name))
      .map((k) => ({
        name: k.name,
        shareholding: k.shareholding,
        age: ageFromDob(k.dob),
      }));
    setApplication((prev) => ({
      ...prev,
      personalGuarantors: guarantors,
      pgCoverage: coverage,
    }));
    next();
  };

  return (
    <PortalShell application={application} activeStep={1}>
      <Box>
        <Paper
          sx={{
            p: 4,
            borderRadius: 4,
            mb: 3,
            background: `linear-gradient(120deg, ${uob.navy}, ${uob.navy2} 55%, ${uob.blue})`,
            color: "white",
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>
            {viaSingpass ? "RETRIEVED VIA SINGPASS · MYINFO" : "RETRIEVED VIA ACRA"}
          </Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.5, letterSpacing: "-0.02em" }}>
            Here's what we retrieved
          </Typography>
          <Typography sx={{ opacity: 0.92, mt: 0.5 }}>
            Review the information pulled on your behalf. We'll use this to
            pre-fill your application — no manual typing needed.
          </Typography>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          {/* Personal (MyInfo Person) */}
          {viaSingpass && person ? (
            <SectionCard title="Your Singpass profile" source="MyInfo Person">
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 3 }}>
                <Field label="Name" value={person.name} />
                <Field label="NRIC / FIN" value={person.nric} />
                <Field label="Date of Birth" value={person.dob} />
                <Field
                  label="Age"
                  value={personAge != null ? `${personAge} years` : "—"}
                />
                <Field label="Nationality" value={person.nationality} />
                <Field label="Residential Status" value={person.residentialStatus} />
                <Field label="Mobile" value={person.mobile} />
                <Field label="Email" value={person.email} />
              </Box>
              <Field label="Registered Address" value={business.registeredAddress} />
            </SectionCard>
          ) : (
            <SectionCard title="Applicant identity" source="Not via Singpass">
              <Typography color="text.secondary" sx={{ py: 2 }}>
                This company was retrieved by UEN via ACRA, so no verified
                personal Singpass profile was pulled. Identity is confirmed
                through the keyman approval step instead.
              </Typography>
            </SectionCard>
          )}

          {/* Business (MyInfo Business) */}
          <SectionCard title="Business profile" source="MyInfo Business">
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 3 }}>
              <Field label="Entity Name" value={profile.companyName} />
              <Field label="UEN" value={profile.uen} />
              <Field label="Entity Type" value={business.entityType} />
              <Field label="Entity Status" value={business.entityStatus} />
              <Field label="Registration Date" value={profile.incorporationDate} />
              <Field label="Issued Capital" value={business.issuedCapital} />
            </Box>
            <Field label="Principal Activity (SSIC)" value={business.primarySsic} />
            <Field label="Registered Address" value={business.registeredAddress} />
          </SectionCard>
        </Box>

        {/* Keymen / personal guarantee */}
        {rankedKeymen.length > 0 && (
          <Paper sx={{ p: 3.5, borderRadius: 4, mt: 3, boxShadow: "0 10px 24px rgba(15,23,42,.06)" }}>
            <Typography fontWeight={900} sx={{ color: uob.ink, mb: 0.5 }}>
              Company keymen & personal guarantee
            </Typography>
            <Typography color="text.secondary" fontSize={14} sx={{ mb: 2 }}>
              All keymen are selected as personal guarantors by default. You may
              choose who provides the personal guarantee, as long as the selected
              guarantors together hold at least {PG_MIN_COVERAGE}% of shareholding.
              Age is derived from the MyInfo date of birth.
            </Typography>

            {/* Coverage meter */}
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                mb: 2,
                bgcolor: meetsCoverage ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${meetsCoverage ? "#bbf7d0" : "#fecaca"}`,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                gap={2}
              >
                <Typography fontWeight={800}>
                  Selected PG shareholding coverage
                </Typography>
                <Typography
                  fontWeight={900}
                  sx={{ color: meetsCoverage ? "#15803d" : "#b91c1c", whiteSpace: "nowrap" }}
                >
                  {coverage}%&nbsp;{meetsCoverage ? "✓" : `(min ${PG_MIN_COVERAGE}%)`}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, coverage)}
                sx={{
                  mt: 1,
                  height: 8,
                  borderRadius: 99,
                  bgcolor: "#e5e7eb",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: meetsCoverage ? "#16a34a" : "#dc2626",
                  },
                }}
              />
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }} padding="checkbox">
                    PG
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">
                    Shareholding
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>PG age eligibility</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rankedKeymen.map((k) => {
                  const age = ageFromDob(k.dob);
                  const ageAtMaturity = age != null ? age + tenureYears : null;
                  const flagged =
                    ageAtMaturity != null && ageAtMaturity > PG_MAX_AGE_AT_MATURITY;
                  const isSelected = selected.has(k.name);
                  return (
                    <TableRow
                      key={k.name}
                      sx={{ bgcolor: isSelected ? "rgba(0,94,184,.04)" : "transparent" }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggle(k.name)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{k.name}</TableCell>
                      <TableCell>{k.role}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {k.shareholding != null ? `${k.shareholding}%` : "—"}
                      </TableCell>
                      <TableCell>
                        {ageAtMaturity == null ? (
                          "—"
                        ) : (
                          <Chip
                            size="small"
                            label={flagged ? "Review" : "Eligible"}
                            sx={{
                              fontWeight: 800,
                              bgcolor: flagged ? "#fee2e2" : "#dcfce7",
                              color: flagged ? "#b91c1c" : "#15803d",
                            }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {!meetsCoverage && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Selected guarantors hold {coverage}% of shareholding. Select
                enough keymen so the personal guarantee covers at least{" "}
                {PG_MIN_COVERAGE}% before continuing.
              </Alert>
            )}

            <Typography fontSize={12} color="text.secondary" sx={{ mt: 2 }}>
              Guideline: a personal guarantor's age at loan maturity
              (age + {tenureYears || "n"} yr tenure) should not exceed{" "}
              {PG_MAX_AGE_AT_MATURITY}.
            </Typography>
          </Paper>
        )}

        <Paper sx={{ p: 3, mt: 3, borderRadius: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button variant="outlined" sx={{ borderRadius: 3, px: 4 }} onClick={back}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleContinue}
              disabled={!meetsCoverage}
              sx={{ borderRadius: 3, px: 5, fontWeight: 800 }}
            >
              Confirm &amp; continue
            </Button>
          </Stack>
        </Paper>
      </Box>
    </PortalShell>
  );
}
