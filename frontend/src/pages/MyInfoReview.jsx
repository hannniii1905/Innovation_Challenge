import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Stack,
  Chip,
  TextField,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import PortalShell from "../components/PortalShell";
import PropertyMapCard from "../components/PropertyMapCard";
import { uob } from "../theme";
import { usePgSelection, PgSelectionCard } from "../components/application/PgSelection";

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
        <Typography sx={{ color: uob.ink, fontWeight: "bold" }}>
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

export default function MyInfoReview({ application, setApplication, next, back, goHome }) {
  const profile = application.profile || {};
  const business = profile.businessInfo || {};
  const keymen = profile.keymen || [];
  const isBukku = application.lane === "BUKKU";
  const dataSource = isBukku ? "Bukku" : "MyInfo Business";

  // Shared personal-guarantor selection (ranking, mandatory >= 25%, minimal
  // default to reach coverage). See components/application/PgSelection.
  const pg = usePgSelection(keymen);
  const { coverage, meetsCoverage } = pg;

  // The logged-in applicant. The initial Singpass login retrieves COMPANY
  // (MyInfo Business) data only — no personal MyInfo is pulled here — so we only
  // know the applicant's name and role. Personal identity is verified later,
  // per selected personal guarantor, on the PG Verification step.
  const applicant = application.applicant || {};

  // Property ownership
  const [propertyOwnership, setPropertyOwnership] = useState("owned");
  const [rentAmount, setRentAmount] = useState("");

  const handleContinue = () => {
    if (!meetsCoverage) return;
    if (propertyOwnership === "rented" && !rentAmount.trim()) {
      alert("Please enter the monthly rent amount.");
      return;
    }
    setApplication((prev) => ({
      ...prev,
      personalGuarantors: pg.buildGuarantors(),
      pgCoverage: coverage,
      propertyOwnership,
      rentAmount: propertyOwnership === "rented" ? rentAmount.trim() : null,
    }));
    next();
  };

  return (
    <PortalShell application={application} activeStep={1} onHome={goHome}>
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
            {isBukku ? "RETRIEVED VIA BUKKU PARTNER FEED" : "RETRIEVED VIA SINGPASS / ACRA"}
          </Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.5, letterSpacing: "-0.02em" }}>
            Here's what we retrieved
          </Typography>
          <Typography sx={{ opacity: 0.92, mt: 0.5 }}>
            {isBukku
              ? "Your company profile and 6 months of bank data were shared securely by Bukku. No Singpass login or document upload needed — just confirm and continue."
              : "Review the information pulled on your behalf. We'll use this to pre-fill your application — no manual filling needed."}
          </Typography>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
        
          {/* Applicant (the logged-in person — not necessarily a guarantor).
              Login retrieves company data only, so we show name + role only;
              no personal MyInfo is available at this stage. */}
          <SectionCard title="Applicant" source={isBukku ? "Bukku" : "Singpass login"}>
            <Box sx={{ py: 1 }}>
              <Field label="Name" value={applicant.name || "Authorised Applicant"} />
              <Field label="Role" value="Submitting on behalf of the company" />
            </Box>
            <Typography
              fontSize={12}
              color="text.secondary"
              sx={{ mt: 1.5, lineHeight: 1.5 }}
            >
              This is the person submitting the application. Being the applicant
              does <strong>not</strong> make them a personal guarantor — guarantors
              are selected below and verify their own identity separately.
            </Typography>
          </SectionCard>
          

          {/* Business (MyInfo Business) */}
          <SectionCard title="Business profile" source={dataSource}>
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

          {isBukku && (
            <Box sx={{ gridColumn: { md: "1 / -1" } }}>
              <SectionCard title="Bank data on file" source="Bukku">
                <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1 }}>
                  <Chip
                    label="6 months"
                    sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 900 }}
                  />
                  <Typography fontSize={14} color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    6 months of corporate bank statements (Jan–Jun 2026) have been
                    shared directly by Bukku and are ready for underwriting. You do
                    not need to upload anything.
                  </Typography>
                </Stack>
              </SectionCard>
            </Box>
          )}

          <Box sx={{ gridColumn: { md: "1 / -1" } }}>
            <SectionCard title="Property Ownership" source={dataSource}>
              <FormControl component="fieldset">
                <RadioGroup
                  value={propertyOwnership}
                  onChange={(e) => setPropertyOwnership(e.target.value)}
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  <Box
                    onClick={() => setPropertyOwnership("owned")}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      cursor: "pointer",
                      border: "1.5px solid",
                      borderColor: propertyOwnership === "owned" ? "#1d4ed8" : "#cbd5e1",
                      borderRadius: 3,
                      px: 3,
                      py: 1.5,
                    }}
                  >
                    <Radio checked={propertyOwnership === "owned"} />
                    <Typography>Owned by Company</Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      cursor: "pointer",
                      border: "1.5px solid",
                      borderColor: propertyOwnership === "rented" ? "#1d4ed8" : "#cbd5e1",
                      borderRadius: 3,
                      px: 3,
                      py: 1.5,
                    }}
                  >
                    <Radio
                      checked={propertyOwnership === "rented"}
                      onClick={() => setPropertyOwnership("rented")}
                    />
                    <Typography>Rented</Typography>
                    <TextField
                      size="small"
                      placeholder="Monthly rent"
                      value={rentAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setRentAmount(val);
                        setPropertyOwnership("rented");
                      }}
                      onClick={() => setPropertyOwnership("rented")}
                      sx={{ width: 160 }}
                      slotProps={{
                        input: {
                          startAdornment: <Typography sx={{ mr: 0.5, color: "text.secondary" }}>S$</Typography>,
                        },
                      }}
                    />
                  </Box>
                </RadioGroup>
              </FormControl>
            </SectionCard>
          </Box>

          <Box sx={{ gridColumn: { md: "1 / -1" } }}>
            <PropertyMapCard address={business.registeredAddress} />
          </Box>
        </Box>

        {/* Keymen / personal guarantee selection (shared component) */}
        <PgSelectionCard {...pg} />

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
