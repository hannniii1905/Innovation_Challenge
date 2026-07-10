import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Divider,
  Stack,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import PortalShell from "../components/PortalShell";
import PropertyMapCard from "../components/PropertyMapCard";
import { acraLookup } from "../api/client";
import { usePgSelection, PgSelectionCard } from "../components/application/PgSelection";

export default function UenLookup({ application, setApplication, next, back, goHome }) {
  const profile = application.profile || {};

  // Personal-guarantor selection (shared with the Singpass MyInfo path). The
  // demo profile's keymen carry shareholding, which the ACRA record does not.
  const pg = usePgSelection(profile.keymen || []);

  const [uen, setUen] = useState(profile.uen || "");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);
  const [addressSame, setAddressSame] = useState("yes");
  const [operatingAddress, setOperatingAddress] = useState("");

  const handleLookup = async () => {
    if (!uen.trim()) {
      setError("Please enter a UEN.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await acraLookup(uen.trim());
      setRecord(res);
      setAddressSame("yes");
      setOperatingAddress("");
    } catch (err) {
      setError(err.message || "ACRA lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!record) return;
    if (!pg.meetsCoverage) return;

    const resolvedAddress =
      addressSame === "yes"
        ? record.registered_address || ""
        : operatingAddress.trim() || record.registered_address || "";

    const enrichedProfile = {
      ...profile,
      uen: record.uen,
      companyName: record.company_name,
      industry: record.ssic_description || profile.industry,
      incorporationDate: record.incorporation_date || profile.incorporationDate,
      directors: (record.keymen || []).map((k) => k.name),
      businessInfo: {
        ...profile.businessInfo,
        registeredAddress: record.registered_address || "",
        operatingAddress: resolvedAddress,
      },
    };

    setApplication((prev) => ({
      ...prev,
      profile: enrichedProfile,
      authMethod: "UEN_ACRA",
      applicant: {
        name: applicantName || "Foreign / Non-Corppass applicant",
        email: applicantEmail,
        isKeyman: false,
      },
      singpass: {
        authenticated: false,
        method: "UEN_ACRA",
        company: enrichedProfile,
      },
      // Selected PGs carried forward as unverified — each will receive an email
      // link on the PG Verification step (the applicant isn't a keyman here).
      personalGuarantors: pg.buildGuarantors(),
      pgCoverage: pg.coverage,
    }));

    next();
  };

  return (
    <PortalShell application={application} sidebar={false} activeStep={1} onHome={goHome}>
      <Paper
        sx={{
          p: { xs: 4, md: 5 },
          borderRadius: 4,
          boxShadow: "0 12px 28px rgba(15,23,42,.08)",
        }}
      >
        <Typography color="#005EB8" fontWeight={950}>
          No Singpass or Corppass
        </Typography>

        <Typography
          sx={{
            mt: 1,
            fontSize: 28,
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
          }}
        >
          Retrieve company details by UEN
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.6, maxWidth: 620 }}>
          If you don't have a Singpass or Corppass account (for example, a
          foreign director), enter the company's UEN to retrieve its registered
          details directly from ACRA. Since you can't verify yourself with
          Singpass, each personal guarantor will be sent a secure link to verify
          their own identity and consent to a credit check.
        </Typography>

        <Box
          sx={{
            mt: 4,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2.5,
          }}
        >
          <TextField
            label="Company UEN"
            value={uen}
            onChange={(e) => setUen(e.target.value)}
            fullWidth
          />
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Button
              variant="contained"
              onClick={handleLookup}
              disabled={loading}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.6,
                fontWeight: 800,
                background: "linear-gradient(90deg, #005EB8 0%, #0072CE 100%)",
              }}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "white" }} />
              ) : (
                "Retrieve from ACRA"
              )}
            </Button>
          </Box>
          <TextField
            label="Your full name"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Your email"
            value={applicantEmail}
            onChange={(e) => setApplicantEmail(e.target.value)}
            fullWidth
          />
        </Box>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {record && (
          <>
            <Divider sx={{ my: 4 }} />

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography fontWeight={900}>ACRA record retrieved</Typography>
              <Chip
                size="small"
                label={record.found ? "Matched registry" : "Synthesized (demo)"}
                sx={{
                  bgcolor: record.found ? "#dcfce7" : "#fef3c7",
                  color: record.found ? "#15803d" : "#b45309",
                  fontWeight: 800,
                }}
              />
            </Stack>

            <Paper
              variant="outlined"
              sx={{ p: 3, borderRadius: 3, bgcolor: "#f5f9fd", mb: 3 }}
            >
              <Typography fontWeight={950}>{record.company_name}</Typography>
              <Typography color="text.secondary" fontSize={14}>
                UEN: {record.uen}
                {record.entity_status ? ` · ${record.entity_status}` : ""}
              </Typography>
              {record.ssic_description && (
                <Typography color="text.secondary" fontSize={14} sx={{ mt: 0.5 }}>
                  {record.ssic_description}
                </Typography>
              )}
            </Paper>

            <Typography fontWeight={900} sx={{ mb: 1.5 }}>
              Registered keymen (from ACRA)
            </Typography>
            <Stack spacing={1.5}>
              {(record.keymen || []).map((keyman) => (
                <Paper
                  key={keyman.email}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    display: "flex",
                    justifyContent: "space-between",
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Typography fontWeight={800}>{keyman.name}</Typography>
                  <Typography color="text.secondary" fontSize={13}>
                    {keyman.role}
                  </Typography>
                </Paper>
              ))}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography fontWeight={900} sx={{ mb: 1.5 }}>
              Registered address (ACRA)
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 3, bgcolor: "#f8fafc", mb: 3 }}
            >
              <Typography fontWeight={700}>
                {record.registered_address || "Not available"}
              </Typography>
            </Paper>

            <Typography fontWeight={900} sx={{ mb: 1.5 }}>
              Is your operating address the same as the registered address?
            </Typography>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <RadioGroup
                row
                value={addressSame}
                onChange={(e) => setAddressSame(e.target.value)}
              >
                <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                <FormControlLabel value="no" control={<Radio />} label="No" />
              </RadioGroup>
            </FormControl>

            {addressSame === "no" && (
              <TextField
                label="Operating address"
                value={operatingAddress}
                onChange={(e) => setOperatingAddress(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder="e.g. 1 Raffles Place, #20-01, Singapore 048616"
                sx={{ mb: 3 }}
              />
            )}

            <PropertyMapCard
              address={
                addressSame === "yes"
                  ? record.registered_address
                  : operatingAddress.trim() || record.registered_address
              }
            />

            {/* Personal guarantor selection — each selected PG will be emailed
                a verification link on the next step. */}
            <PgSelectionCard {...pg} />
          </>
        )}

        <Divider sx={{ my: 4 }} />

        <Stack direction="row" justifyContent="space-between">
          <Button variant="outlined" sx={{ borderRadius: 3, px: 4 }} onClick={back}>
            Back to login
          </Button>
          <Button
            variant="contained"
            disabled={!record || !pg.meetsCoverage}
            onClick={handleContinue}
            sx={{
              borderRadius: 3,
              px: 5,
              fontWeight: 800,
              background: "linear-gradient(90deg, #005EB8 0%, #0072CE 100%)",
            }}
          >
            Continue
          </Button>
        </Stack>
      </Paper>
    </PortalShell>
  );
}
