import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
} from "@mui/material";
import PortalShell from "../components/PortalShell";

function PhoneFrame({ children }) {
  return (
    <Box
      sx={{
        width: 290,
        mx: "auto",
        bgcolor: "#111827",
        borderRadius: "34px",
        p: "10px",
        boxShadow: "0 24px 50px rgba(15,23,42,.22)",
      }}
    >
      <Box
        sx={{
          bgcolor: "#fff",
          borderRadius: "26px",
          overflow: "hidden",
          minHeight: 590,
          position: "relative",
        }}
      >
        <Box
          sx={{
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            fontSize: 12,
            fontWeight: 800,
            color: "#111827",
            bgcolor: "#fff",
          }}
        >
          <span>5:41</span>
          <span>4G ◔</span>
        </Box>
        {children}
      </Box>
    </Box>
  );
}

function UobBadge({ small = false }) {
  return (
    <Box
      sx={{
        width: small ? 34 : 42,
        height: small ? 34 : 42,
        borderRadius: 2,
        bgcolor: "#1e3a8a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: small ? 11 : 13,
        letterSpacing: 0.5,
      }}
    >
      UOB
    </Box>
  );
}

export default function SingpassLogin({
  application,
  setApplication,
  next,
  back,
}) {
  const [step, setStep] = useState("landing");

  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => next(), 1500);
      return () => clearTimeout(timer);
    }
  }, [step, next]);

  if (step === "success") {
    return (
      <PortalShell application={application} activeStep={1}>
        <Paper
          sx={{
            p: 6,
            borderRadius: 4,
            boxShadow: "0 12px 28px rgba(15,23,42,.08)",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              mx: "auto",
              borderRadius: "24px",
              bgcolor: "#16a34a",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 54,
              fontWeight: 900,
              mb: 3,
            }}
          >
            ✓
          </Box>

          <Typography variant="h4" fontWeight={950}>
            Login Approved
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Retrieving your MyInfo Business profile and preparing the application form...
          </Typography>
        </Paper>
      </PortalShell>
    );
  }

  return (
    <PortalShell application={application} activeStep={1}>
      <Paper
        sx={{
          p: 5,
          borderRadius: 4,
          boxShadow: "0 12px 28px rgba(15,23,42,.08)",
        }}
      >
        {step === "landing" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 5,
              alignItems: "center",
            }}
          >
            <Box>
              <Typography color="#4f46e5" fontWeight={950}>
                Secure Business Login
              </Typography>

            <Typography
              sx={{
                mt: 1,
                mb: 0.5,
                fontSize: "28px",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
              }}
            >
              Link Business Profile with Singpass
            </Typography>

              <Typography color="text.secondary" sx={{ mt: 2.5, lineHeight: 1.2 }}>
                Retrieve registered entity information securely via Singpass MyInfo
                Business to pre-fill your application and reduce manual entry.
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  mt: 4,
                  p: 3,
                  borderRadius: 3,
                  bgcolor: "#faf7ff",
                  border: "1px solid #e9d5ff",
                }}
              >
                <Typography fontWeight={950}>
                  Company
                </Typography>
                <Typography sx={{ mt: 1 }}>
                  {application.profile.companyName}
                </Typography>
                <Typography color="text.secondary" fontSize={14}>
                  UEN: {application.profile.uen}
                </Typography>
              </Paper>

              <Button
                onClick={() => setStep("qr")}
                variant="contained"
                sx={{
                  mt: 4,
                  bgcolor: "#dc2626",
                  "&:hover": { bgcolor: "#b91c1c" },
                  px: 4,
                  py: 1.6,
                  borderRadius: 3,
                  fontWeight: 950,
                  boxShadow: "0 10px 24px rgba(220,38,38,.25)",
                }}
              >
                <span style={{ fontWeight: 950, marginRight: 12 }}>
                  singpass
                </span>
                Log In with MyInfo Business
              </Button>

              <Box sx={{ mt: 2 }}>
                <Button variant="text" onClick={back}>
                  Back to profile selection
                </Button>
              </Box>
            </Box>

            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: "#fcfcff",
              }}
            >
              <Typography variant="h6" fontWeight={950} color="#4f46e5">
                How it works
              </Typography>

              {[
                ["Scan QR Code", "Use your Singpass app to scan the login QR code."],
                ["Approve Login", "Review the request and approve the login on your mobile device."],
                ["Continue Securely", "Your verified business profile is retrieved automatically."],
              ].map(([title, desc], i) => (
                <Box key={title} sx={{ display: "flex", gap: 2, mt: 3 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      bgcolor: "#ede9fe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Box>
                    <Typography fontWeight={800} sx={{ mb: 0.5 }}>
                      {title}
                    </Typography>
                    <Typography color="text.secondary" fontSize={14}>
                      {desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Box>
        )}

        {step === "qr" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 5,
              alignItems: "center",
            }}
          >
            <Box>
              <Typography color="#4f46e5" fontWeight={950}>
                Step 1 of 2
              </Typography>

              <Typography variant="h4" fontWeight={950} sx={{ mt: 1 }}>
                Scan the QR Code
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.8 }}>
                Open the Singpass app and scan the QR code shown on the phone screen.
                After that, you will be prompted to approve the login request.
              </Typography>

              <Button
                variant="contained"
                sx={{ mt: 4, borderRadius: 3, px: 4, py: 1.3, fontWeight: 900 }}
                onClick={() => setStep("approve")}
              >
                Simulate QR Scan
              </Button>
            </Box>

            <PhoneFrame>
              <Box sx={{ borderBottom: "1px solid #e5e7eb", px: 2, py: 1.2, textAlign: "center", fontSize: 12, color: "#475569" }}>
                login.id.singpass.gov.sg
              </Box>

              <Box sx={{ px: 3, pt: 2, pb: 3, textAlign: "center" }}>
                <Typography variant="h6" fontWeight={950}>
                  Log in with Singpass
                </Typography>
                <Typography color="text.secondary" fontSize={13}>
                  Your trusted digital identity
                </Typography>

                <Box
                  sx={{
                    mt: 3,
                    display: "flex",
                    justifyContent: "center",
                    gap: 4,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <Typography
                    sx={{
                      pb: 1.2,
                      borderBottom: "3px solid #ef4444",
                      color: "#ef4444",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    Singpass app
                  </Typography>
                  <Typography
                    sx={{
                      pb: 1.2,
                      color: "#94a3b8",
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    Password login
                  </Typography>
                </Box>

                <Typography fontWeight={900} sx={{ mt: 3 }}>
                  Tap QR code
                </Typography>
                <Typography color="text.secondary" fontSize={13} sx={{ mb: 2 }}>
                  to log in with Singpass app
                </Typography>

                <Box
                  sx={{
                    display: "inline-flex",
                    p: 1.5,
                    border: "3px solid #ef4444",
                    borderRadius: 3,
                    bgcolor: "white",
                    position: "relative",
                  }}
                >
                  <QRCode value={`UOB-${application.profile.uen}`} size={160} />
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: "#ef4444",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 950,
                        fontSize: 11,
                      }}
                    >
                      i
                    </Box>
                  </Box>
                </Box>

                <Typography
                  sx={{
                    mt: 1.5,
                    color: "#ef4444",
                    fontWeight: 950,
                    letterSpacing: 0.3,
                  }}
                >
                  singpass
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ color: "#4f46e5", fontSize: 13, mb: 1 }}>
                    Register for Singpass
                  </Typography>
                  <Typography sx={{ color: "#4f46e5", fontSize: 13 }}>
                    Download Singpass app
                  </Typography>
                </Box>
              </Box>
            </PhoneFrame>
          </Box>
        )}

        {step === "approve" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 5,
              alignItems: "center",
            }}
          >
            <Box>
              <Typography color="#4f46e5" fontWeight={950}>
                Step 2 of 2
              </Typography>

              <Typography variant="h4" fontWeight={950} sx={{ mt: 1 }}>
                Approve Login Request
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.8 }}>
                Review the login request on your mobile device and approve it
                to continue to the UOB loan application portal.
              </Typography>

              <Button
                variant="outlined"
                sx={{ mt: 4, borderRadius: 3, px: 4, py: 1.3, fontWeight: 900 }}
                onClick={() => setStep("qr")}
              >
                Back to QR
              </Button>
            </Box>

            <PhoneFrame>
              <Box sx={{ px: 3, py: 2.5, textAlign: "center" }}>
                <Typography variant="h6" fontWeight={950}>
                  Updated
                </Typography>

                <Box
                  sx={{
                    mt: 2.5,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: "#ef4444",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 950,
                    }}
                  >
                    i
                  </Box>

                  <Typography fontWeight={900}>→</Typography>

                  <UobBadge small />
                </Box>

                <Typography sx={{ mt: 2, fontSize: 11, color: "#64748b" }}>
                  Log in to
                </Typography>

                <Typography variant="h6" fontWeight={950}>
                  UOB Credit AI
                </Typography>

                <Box sx={{ mt: 3, textAlign: "left" }}>
                  <Typography fontSize={11} color="#64748b" sx={{ mb: 1 }}>
                    Logging in as
                  </Typography>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.2,
                      borderRadius: 2.5,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Typography fontSize={12} fontWeight={800}>
                      {application.profile.directors?.[0] || "Authorised User"}
                    </Typography>
                    <Typography fontSize={12}>👁️</Typography>
                  </Paper>
                </Box>

                <Box sx={{ display: "flex", gap: 1.2, mt: 3 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    sx={{ borderRadius: 2, minHeight: 38, fontWeight: 900, fontSize: 12 }}
                    onClick={back}
                  >
                    ✕ Reject
                  </Button>

                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    sx={{ borderRadius: 2, minHeight: 38, fontWeight: 900, fontSize: 12 }}
                    onClick={() => {
                      setApplication((prev) => ({
                        ...prev,
                        singpass: {
                          authenticated: true,
                          company: prev.profile,
                        },
                      }));
                      setStep("success");
                    }}
                  >
                    ✓ Approve
                  </Button>
                </Box>

                <Typography
                  sx={{
                    mt: 2.5,
                    fontSize: 10,
                    color: "#94a3b8",
                    textAlign: "left",
                  }}
                >
                  {new Date().toLocaleDateString("en-SG", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  ,{" "}
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
            </PhoneFrame>
          </Box>
        )}
      </Paper>
    </PortalShell>
  );
}