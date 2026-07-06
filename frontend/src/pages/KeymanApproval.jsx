import { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Stack,
  Chip,
} from "@mui/material";
import PortalShell from "../components/PortalShell";
import { requestKeymanApproval } from "../api/client";

// For the demo we auto-advance after this delay so the flow is never blocked,
// while still showing the realistic "awaiting keyman approval" state.
const AUTO_CONTINUE_MS = 12000;

export default function KeymanApproval({ application, next, back }) {
  const profile = application.profile || {};
  const applicant = application.applicant || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notified, setNotified] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.round(AUTO_CONTINUE_MS / 1000)
  );
  const requested = useRef(false);

  // Fire the keyman notification once on mount.
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    requestKeymanApproval({
      uen: profile.uen,
      applicantName: applicant.name,
      applicantEmail: applicant.email,
    })
      .then((res) => {
        setNotified(res.notified_keymen || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to notify keymen.");
      })
      .finally(() => setLoading(false));
  }, [profile.uen, applicant.name, applicant.email]);

  // Demo-only countdown that auto-continues so the flow isn't blocked.
  useEffect(() => {
    if (loading) return;
    if (secondsLeft <= 0) {
      next();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [loading, secondsLeft, next]);

  return (
    <PortalShell application={application} activeStep={1}>
      <Paper
        sx={{
          p: { xs: 4, md: 6 },
          borderRadius: 4,
          boxShadow: "0 12px 28px rgba(15,23,42,.08)",
        }}
      >
        <Box sx={{ textAlign: "center", maxWidth: 640, mx: "auto" }}>
          <Box
            sx={{
              width: 96,
              height: 96,
              mx: "auto",
              borderRadius: "28px",
              bgcolor: "#fff7ed",
              border: "2px solid #fed7aa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
            }}
          >
            {loading ? (
              <CircularProgress size={40} sx={{ color: "#f59e0b" }} />
            ) : (
              <Typography sx={{ fontSize: 44 }}>🕓</Typography>
            )}
          </Box>

          <Chip
            label="Authorisation required"
            sx={{
              mb: 2,
              bgcolor: "#fef3c7",
              color: "#b45309",
              fontWeight: 800,
            }}
          />

          <Typography variant="h4" fontWeight={950} sx={{ lineHeight: 1.2 }}>
            Awaiting the keymen's approval
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
            You are applying for BizMoney financing on behalf of{" "}
            <strong>{profile.companyName}</strong> (UEN: {profile.uen}) but you
            are not listed as an authorised keyman for this entity. We've
            retrieved the registered keymen from ACRA and sent them an approval
            request. Your application will proceed once a keyman approves.
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography fontWeight={900} sx={{ mb: 2 }}>
          Approval requests sent to
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {loading && !error && (
          <Typography color="text.secondary">
            Retrieving keymen from ACRA…
          </Typography>
        )}

        <Stack spacing={1.5}>
          {notified.map((keyman) => (
            <Paper
              key={keyman.email}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "#f8fafc",
              }}
            >
              <Box>
                <Typography fontWeight={800}>{keyman.name}</Typography>
                <Typography color="text.secondary" fontSize={13}>
                  {keyman.role} · {keyman.masked_email}
                </Typography>
              </Box>
              <Chip
                size="small"
                label="✓ Email sent"
                sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 800 }}
              />
            </Paper>
          ))}
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: "#e6f0fa",
            border: "1px solid #b3d1ec",
            mb: 3,
          }}
        >
          <Typography fontSize={13} color="#4338ca" fontWeight={700}>
            Demo mode
          </Typography>
          <Typography fontSize={13} color="#005EB8" sx={{ mt: 0.5 }}>
            In production the application would pause here until a keyman
            approves. For this demo you can continue immediately
            {loading ? "." : ` (auto-continuing in ${secondsLeft}s).`}
          </Typography>
        </Box>

        <Stack direction="row" justifyContent="space-between">
          <Button variant="outlined" sx={{ borderRadius: 3, px: 4 }} onClick={back}>
            Back
          </Button>
          <Button
            variant="contained"
            disabled={loading}
            sx={{
              borderRadius: 3,
              px: 5,
              fontWeight: 800,
              background: "linear-gradient(90deg, #005EB8 0%, #0072CE 100%)",
            }}
            onClick={next}
          >
            Continue (demo)
          </Button>
        </Stack>
      </Paper>
    </PortalShell>
  );
}
