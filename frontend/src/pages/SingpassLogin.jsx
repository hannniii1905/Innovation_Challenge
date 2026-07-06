import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
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
  needsKeymanApproval,
  useUenInstead,
  back,
}) {
  const [step, setStep] = useState("landing");
  const directors = application.profile.directors || [];
  // Who is logging in: an authorised director (keyman) or a non-director rep.
  // We avoid revealing the company's actual keymen before login completes.
  const [applicantChoice, setApplicantChoice] = useState("keyman");

  const isKeyman = applicantChoice === "keyman";
  const applicantName = isKeyman
    ? directors[0] || "Authorised Director"
    : "Authorised Representative";

  const handleApprove = () => {
    setApplication((prev) => ({
      ...prev,
      authMethod: "SINGPASS_MYINFO",
      applicant: {
        name: applicantName,
        email: null,
        isKeyman,
      },
      singpass: {
        authenticated: true,
        method: "SINGPASS_MYINFO",
        company: prev.profile,
        keymanApprovalPending: !isKeyman,
      },
    }));

    // After approving the login, Singpass shows the MyInfo consent screen.
    setStep("consent");
  };

  const handleAgree = () => {
    if (isKeyman) {
      setStep("success");
    } else {
      // Non-keyman applicant → route to the keyman approval gate.
      needsKeymanApproval();
    }
  };

  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => next(), 1500);
      return () => clearTimeout(timer);
    }
  }, [step, next]);

  if (step === "success") {
    return (
      <PortalShell application={application} sidebar={false} activeStep={1}>
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
    <PortalShell application={application} sidebar={false} activeStep={1}>
      <Paper
        sx={{
          p: 5,
          borderRadius: 4,
          boxShadow: "0 12px 28px rgba(15,23,42,.08)",
        }}
      >
        {step === "landing" && (
          <Box sx={{ maxWidth: 540, mx: "auto", textAlign: "center", py: { xs: 2, md: 4 } }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 0.75,
                borderRadius: 99,
                bgcolor: "#e6f0fa",
                color: "#005EB8",
                fontWeight: 800,
                fontSize: 13,
                mb: 3,
              }}
            >
              🔒 Secure Business Login
            </Box>

            <Typography
              sx={{
                fontSize: { xs: 30, md: 38 },
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              Apply for BizMoney financing in minutes
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ mt: 2, fontSize: 16, lineHeight: 1.6, maxWidth: 440, mx: "auto" }}
            >
              Let's fetch some business info from
            </Typography>

            <Box
              sx={{
                mt: 3,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                justifyContent: "center",
              }}
            >
              <Button
                onClick={() => setStep("qr")}
                variant="contained"
                sx={{
                  flex: 1,
                  maxWidth: 240,
                  bgcolor: "#dc2626",
                  "&:hover": { bgcolor: "#b91c1c" },
                  py: 1.8,
                  borderRadius: 3,
                  fontWeight: 950,
                  fontSize: 16,
                  boxShadow: "0 12px 28px rgba(220,38,38,.28)",
                }}
              >
                MyInfo Business
              </Button>

              <Button
                onClick={useUenInstead}
                variant="outlined"
                sx={{
                  flex: 1,
                  maxWidth: 240,
                  py: 1.8,
                  borderRadius: 3,
                  fontWeight: 950,
                  fontSize: 16,
                  color: "#005EB8",
                  borderColor: "#b3d1ec",
                  borderWidth: 2,
                  "&:hover": { borderColor: "#005EB8", borderWidth: 2, bgcolor: "#e6f0fa" },
                }}
              >
                ACRA Search
              </Button>
            </Box>

            <Box
              sx={{
                mt: 2.5,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                justifyContent: "center",
                maxWidth: 500,
                mx: "auto",
              }}
            >
              <Typography fontSize={12.5} color="text.secondary" sx={{ flex: 1, maxWidth: 240 }}>
                Log in with Singpass to auto-fill verified company details.
              </Typography>
              <Typography fontSize={12.5} color="text.secondary" sx={{ flex: 1, maxWidth: 240 }}>
                No Singpass or Corppass? Look up the company by UEN — ideal for
                foreign directors.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Button
              variant="text"
              onClick={back}
              sx={{ color: "text.secondary", textTransform: "none" }}
            >
              Back to profile selection
            </Button>
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
              <Typography color="#005EB8" fontWeight={950}>
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
                  <Typography sx={{ color: "#005EB8", fontSize: 13, mb: 1 }}>
                    Register for Singpass
                  </Typography>
                  <Typography sx={{ color: "#005EB8", fontSize: 13 }}>
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
              <Typography color="#005EB8" fontWeight={950}>
                Step 2 of 2
              </Typography>

              <Typography variant="h4" fontWeight={950} sx={{ mt: 1 }}>
                Approve Login Request
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.8 }}>
                Review the login request on your mobile device and approve it
                to continue to the UOB loan application portal.
              </Typography>

              <Paper
                variant="outlined"
                sx={{ mt: 3, p: 2.5, borderRadius: 3, bgcolor: "#f8fafc" }}
              >
                <Typography fontWeight={800} fontSize={14} sx={{ mb: 1.5 }}>
                  Who is applying?
                </Typography>
                <RadioGroup
                  value={applicantChoice}
                  onChange={(e) => setApplicantChoice(e.target.value)}
                >
                  <FormControlLabel
                    value="keyman"
                    control={<Radio size="small" />}
                    label={
                      <Typography fontSize={14}>
                        An authorised director{" "}
                        <Typography
                          component="span"
                          fontSize={12}
                          color="#15803d"
                          fontWeight={800}
                        >
                          · Authorised keyman
                        </Typography>
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="other"
                    control={<Radio size="small" />}
                    label={
                      <Typography fontSize={14}>
                        A non-director representative{" "}
                        <Typography
                          component="span"
                          fontSize={12}
                          color="#b45309"
                          fontWeight={800}
                        >
                          · Needs keyman approval
                        </Typography>
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Paper>

              <Button
                variant="outlined"
                sx={{ mt: 3, borderRadius: 3, px: 4, py: 1.3, fontWeight: 900 }}
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
                      {applicantName}
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
                    onClick={handleApprove}
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

        {step === "consent" && (
          <Box sx={{ maxWidth: 560, mx: "auto" }}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                borderTop: "5px solid #ef4444",
              }}
            >
              <Box sx={{ px: { xs: 3, md: 4 }, pt: 3, pb: 1, textAlign: "center" }}>
                <Typography
                  sx={{ color: "#ef4444", fontWeight: 950, fontSize: 26, letterSpacing: "-0.02em" }}
                >
                  singpass
                </Typography>
                <Typography color="text.secondary" fontSize={13} sx={{ mt: 1, lineHeight: 1.5 }}>
                  Singpass retrieves data from relevant government agencies to
                  pre-fill the relevant fields, making digital transactions
                  faster and more convenient.
                </Typography>
              </Box>

              <Box sx={{ px: { xs: 3, md: 4 }, py: 2, bgcolor: "#f6f4fb" }}>
                <Typography fontWeight={800} fontSize={14} sx={{ lineHeight: 1.5 }}>
                  This digital service, <strong>UOB Credit AI</strong>, by United
                  Overseas Bank Limited, is requesting the following information
                  from Singpass to pre-fill your business loan application:
                </Typography>
              </Box>

              <Box sx={{ px: { xs: 3, md: 4 }, py: 2 }}>
                <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: ".06em", mb: 1 }}>
                  Personal (MyInfo)
                </Typography>
                {[
                  "NRIC / FIN",
                  "Full Name",
                  "Date of Birth",
                  "Nationality & Residential Status",
                  "Registered Address",
                  "Contact Details (Mobile & Email)",
                ].map((item) => (
                  <Typography key={item} sx={{ py: 0.6, fontSize: 15, borderBottom: "1px solid #f1f5f9" }}>
                    › {item}
                  </Typography>
                ))}

                <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: ".06em", mt: 2.5, mb: 1 }}>
                  Business (MyInfo Business)
                </Typography>
                {[
                  "Entity Name & UEN",
                  "Entity Type & Status",
                  "Principal Activity (SSIC)",
                  "Registered Address",
                  "Share Capital",
                  "Appointments — Directors & Shareholders",
                ].map((item) => (
                  <Typography key={item} sx={{ py: 0.6, fontSize: 15, borderBottom: "1px solid #f1f5f9" }}>
                    › {item}
                  </Typography>
                ))}
              </Box>

              <Box sx={{ px: { xs: 3, md: 4 }, pb: 3 }}>
                <Typography fontSize={12} color="text.secondary" sx={{ textAlign: "center", mb: 2.5 }}>
                  Clicking "I Agree" permits this digital service to retrieve your
                  data based on the Terms of Use.
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setStep("approve")}
                    sx={{ borderRadius: 2, py: 1.3, fontWeight: 800 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    onClick={handleAgree}
                    sx={{ borderRadius: 2, py: 1.3, fontWeight: 900 }}
                  >
                    I Agree
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </Paper>
    </PortalShell>
  );
}