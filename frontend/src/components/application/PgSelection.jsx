import { useMemo, useState } from "react";
import {
  Paper,
  Box,
  Typography,
  Stack,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
} from "@mui/material";
import { uob } from "../../theme";

// Selected personal guarantors must collectively hold at least this much equity.
export const PG_MIN_COVERAGE = 50;

/**
 * Shared personal-guarantor selection logic, used by both the Singpass MyInfo
 * review step and the ACRA / UEN-lookup path.
 *
 * Ranks keymen by shareholding, marks those with >= 25% as mandatory, and
 * defaults the selection to the minimal set that reaches PG_MIN_COVERAGE.
 */
export function usePgSelection(keymen) {
  const rankedKeymen = useMemo(
    () => [...keymen].sort((a, b) => (b.shareholding || 0) - (a.shareholding || 0)),
    [keymen]
  );

  const mandatoryPgs = useMemo(
    () => new Set(rankedKeymen.filter((k) => (k.shareholding || 0) >= 25).map((k) => k.name)),
    [rankedKeymen]
  );

  const [selected, setSelected] = useState(() => {
    const names = new Set(mandatoryPgs);
    let total = rankedKeymen
      .filter((k) => names.has(k.name))
      .reduce((sum, k) => sum + (k.shareholding || 0), 0);
    for (const k of rankedKeymen) {
      if (total >= PG_MIN_COVERAGE) break;
      if (!names.has(k.name)) {
        names.add(k.name);
        total += k.shareholding || 0;
      }
    }
    return names;
  });

  const toggle = (name) => {
    if (mandatoryPgs.has(name)) return; // mandatory PGs cannot be deselected
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const coverage = rankedKeymen
    .filter((k) => selected.has(k.name))
    .reduce((sum, k) => sum + (k.shareholding || 0), 0);

  const meetsCoverage = coverage >= PG_MIN_COVERAGE;

  // Build the personal-guarantor records carried forward as UNVERIFIED. Their
  // personal data (DOB, IRAS NOA income, CBS) cannot be pulled here — each PG
  // verifies themselves on the PG Verification step.
  const buildGuarantors = () =>
    rankedKeymen
      .filter((k) => selected.has(k.name))
      .map((k) => ({
        name: k.name,
        role: k.role,
        shareholding: k.shareholding,
        nric: k.nric,
        dob: null,
        age: null,
        verified: false,
        method: null,
        cbsConsent: false,
        irasIncome: null,
      }));

  return { rankedKeymen, mandatoryPgs, selected, toggle, coverage, meetsCoverage, buildGuarantors };
}

/**
 * The keymen table + coverage meter used to pick personal guarantors. Presents
 * the state produced by usePgSelection.
 */
export function PgSelectionCard({ rankedKeymen, mandatoryPgs, selected, toggle, coverage, meetsCoverage }) {
  if (rankedKeymen.length === 0) return null;

  return (
    <Paper sx={{ p: 3.5, borderRadius: 4, mt: 3, boxShadow: "0 10px 24px rgba(15,23,42,.06)" }}>
      <Typography sx={{ color: uob.ink, mb: 0.5, fontWeight: "bold" }}>
        Company Keymen & Personal Guarantee
      </Typography>
      <Typography color="text.secondary" fontSize={14} sx={{ mb: 2 }}>
        Shareholders with <strong>25% or more shareholding are mandatory</strong> and
        cannot be deselected. You may choose other guarantors, as long as the selected
        guarantors together hold at least {PG_MIN_COVERAGE}% of shareholding. Each
        selected guarantor will be asked to verify their identity and consent to a
        personal credit check in the next step.
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
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Typography fontWeight={800} sx={{ mr: 0.5 }}>
            Selected PG shareholding coverage:
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
            "& .MuiLinearProgress-bar": { bgcolor: meetsCoverage ? "#16a34a" : "#dc2626" },
          }}
        />
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800 }} padding="checkbox">PG</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Role</TableCell>
            <TableCell sx={{ fontWeight: 800 }} align="right">Shareholding</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rankedKeymen.map((k) => {
            const isSelected = selected.has(k.name);
            const isMandatory = mandatoryPgs.has(k.name);
            return (
              <TableRow
                key={k.name}
                sx={{
                  bgcolor: isSelected ? "rgba(0,94,184,.04)" : "transparent",
                  opacity: isMandatory ? 0.7 : 1,
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggle(k.name)}
                    disabled={isMandatory}
                    size="small"
                    title={isMandatory ? "Auto-selected (shareholding ≥ 25%)" : ""}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{k.name}</TableCell>
                <TableCell>{k.role}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {k.shareholding != null ? `${k.shareholding}%` : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {!meetsCoverage && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Selected guarantors hold {coverage}% of shareholding. Select enough keymen
          so the personal guarantee covers at least {PG_MIN_COVERAGE}% before
          continuing.
        </Alert>
      )}
    </Paper>
  );
}
