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
} from "@mui/material";
import PortalShell from "../components/PortalShell";
import { acraLookup } from "../api/client";

export default function UenLookup({ application, setApplication, next, back, goHome }) {
  const profile = application.profile || {};

  const [uen, setUen] = useState(profile.uen || "");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);

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
    } catch (err) {
      setError(err.message || "ACRA lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!record) return;

    const enrichedProfile = {
      ...profile,
      uen: record.uen,
      companyName: record.company_name,
      industry: record.ssic_description || profile.industry,
      incorporationDate: record.incorporation_date || profile.incorporationDate,
      directors: (record.keymen || []).map((k) => k.name),
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
        keymanApprovalPending: true,
      },
    }));

    // No verified identity via ACRA-by-UEN, so route through keyman approval.
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
          details directly from ACRA. As your identity can't be verified this
          way, the application will require approval from an authorised keyman.
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
          </>
        )}

        <Divider sx={{ my: 4 }} />

        <Stack direction="row" justifyContent="space-between">
          <Button variant="outlined" sx={{ borderRadius: 3, px: 4 }} onClick={back}>
            Back to login
          </Button>
          <Button
            variant="contained"
            disabled={!record}
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
