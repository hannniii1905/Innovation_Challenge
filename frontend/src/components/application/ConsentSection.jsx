import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Button,
  Stack,
  Chip,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { Person, EditNote } from "@mui/icons-material";
import { QRCode } from "react-qr-code";

export default function ConsentSection({ application, setApplication }) {
  const consent = application.consent || {};
  // The application is signed by the logged-in applicant (the person submitting
  // on behalf of the company), not by a "primary keyman" — there is no keyman
  // selection at login under the current flow.
  const signingParty = application.applicant?.name || "Authorised Applicant";
  const [showPopup, setShowPopup] = useState(false);
  const [screen, setScreen] = useState("qr");
  const refCode = useMemo(() => String(Math.floor(1000 + Math.random() * 9000)), []);

  useEffect(() => {
    if (screen !== "loading") return;
    const timer = setTimeout(() => setScreen("sign"), 3000);
    return () => clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    if (screen !== "processing") return;
    const timer = setTimeout(() => {
      setShowPopup(false);
      setApplication((prev) => ({
        ...prev,
        consent: {
          ...prev.consent,
          singpassSigned: true,
          singpassSignedAt: new Date().toISOString(),
        },
      }));
    }, 3000);
    return () => clearTimeout(timer);
  }, [screen]);

  const update = (field, value) => {
    setApplication((prev) => ({
      ...prev,
      consent: {
        ...prev.consent,
        [field]: value,
      },
    }));
  };

  const singpassSigned = consent.singpassSigned || false;
  const signedAt = consent.singpassSignedAt || null;

  const handleSign = () => {
    setShowPopup(true);
    setScreen("qr");
  };

  const items = [
    {
      field: "screening",
      label:
        "I consent to the Bank conducting verification, fraud screening, litigation screening, sanctions screening, and other internal risk checks as may be reasonably required for credit assessment.",
    },
    {
      field: "declaration",
      label:
        "I confirm that all information and documents provided in connection with this application are true, accurate and complete to the best of my knowledge.",
    },
  ];

  const allConsentChecked = items.every((item) => consent[item.field] === true);

  return (
    <Card
      elevation={0}
      sx={{
        mb: 4,
        borderRadius: 5,
        border: "1px solid #e5e7eb",
        boxShadow: "0 18px 40px rgba(15,23,42,.07)",
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            px: 4,
            py: 3,
            borderBottom: "1px solid #e5e7eb",
            background:
              "linear-gradient(90deg, rgba(230,240,250,0.9), rgba(255,255,255,0.9))",
          }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
            Declaration and Consent
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.8, fontSize: 14 }}>
            Please review and acknowledge the following consent items before submission.
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          <Box
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid #e5e7eb",
              borderRadius: 3,
              p: 2,
            }}
          >
            <FormGroup>
              {items.map((item) => (
                <Box
                  key={item.field}
                  sx={{
                    p: 2,
                    borderBottom:
                      item.field === "declaration" ? "none" : "1px solid #e5e7eb",
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={consent[item.field] || false}
                        disabled={singpassSigned}
                        onChange={(e) => update(item.field, e.target.checked)}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: 14.5, lineHeight: 1.6 }}>
                        {item.label}
                      </Typography>
                    }
                  />
                </Box>
              ))}
            </FormGroup>
          </Box>
        </Box>

        <Divider />

        <Box sx={{ p: 4 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#0f172a", mb: 2 }}>
            Digital Signature via Singpass
          </Typography>

          {!singpassSigned ? (
            <Box>
              <Typography fontWeight={700} sx={{ mb: 1.5, lineHeight: 1.5 }}>
                Sign with your Singpass to legally authorise this application.
              </Typography>
              <Typography color="text.secondary" fontSize={14} sx={{ lineHeight: 1.6, mb: 2 }}>
                By signing via the Singpass app, you are digitally executing
                this application in accordance with the Electronic Transactions
                Act. The signature is legally binding and equivalent to a
                wet-ink signature.
              </Typography>
              <Box sx={{ textAlign: "center" }}>
                <Button
                variant="contained"
                disabled={!allConsentChecked}
                onClick={handleSign}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  px: 4,
                  bgcolor: "#ef4444",
                  "&:hover": { bgcolor: "#dc2626" },
                }}
              >
                Approve via Singpass
              </Button>
            </Box>
            </Box>
          ) : (
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "#f0fdf4",
                border: "1px solid #86efac",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    bgcolor: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 900,
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </Box>
                <Box>
                  <Typography fontWeight={800} color="#15803d" sx={{ mb: 0.5 }}>
                    Signed via Singpass
                  </Typography>
                  <Typography fontSize={13} color="text.secondary">
                    Signed by <strong>SXXXX123G</strong> on{" "}
                    {signedAt
                      ? new Date(signedAt).toLocaleString("en-SG", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Singapore",
                        })
                      : ""}{" "}
                    (SGT)
                  </Typography>
                  <Typography fontSize={13} color="text.secondary" sx={{ mt: 0.5 }}>
                    Transaction ID: UOB-{String(Math.floor(Math.random() * 900000) + 100000)}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <Chip
                      label="Singpass Digital Signature"
                      size="small"
                      sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 700 }}
                    />
                    <Chip
                      label="Non-repudiable"
                      size="small"
                      sx={{ bgcolor: "#fef3c7", color: "#b45309", fontWeight: 700 }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>

        <Dialog open={showPopup} onClose={() => setShowPopup(false)} maxWidth="md">
          {screen !== "sign" && (
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16, textAlign: "center", pt: 3 }}>
              Digital Signature via Singpass
            </DialogTitle>
          )}
          <DialogContent sx={{ textAlign: "center", pb: 3, boxSizing: "border-box", overflow: "auto" }}>
            {screen === "loading" ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  py: 6,
                  "@keyframes spin": {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                  },
                }}
              >
                <Box
                  sx={{
                    height: 120,
                    position: "relative",
                    width: 120,
                    mx: "auto",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: "4px solid #ef4444",
                      borderTopColor: "transparent",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Person sx={{ fontSize: 64, color: "#ef4444" }} />
                  </Box>
                </Box>
                <Typography sx={{ fontWeight: "bold !important", fontSize: 14, mt: 3, color: "#ef4444" }}>
                  LOADING...
                </Typography>
              </Box>
            ) : screen === "sign" ? (
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#0f172a", mb: 0.5 }}>
                  Sign this document
                </Typography>

                <Box sx={{ mb: 0.5 }}>
                  <EditNote sx={{ fontSize: 48, color: "#64748b" }} />
                </Box>

                <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#0f172a", mb: 0.2 }}>
                  Declaration & Consent.pdf
                </Typography>
                <Typography fontSize={8} color="text.secondary" sx={{ mb: 1 }}>
                  as
                </Typography>

                <Box
                  sx={{
                    bgcolor: "#f8fafc",
                    borderRadius: 2,
                    border: "1px solid #e5e7eb",
                    p: 2,
                    mb: 3,
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 1.5 }}>
                    <Person sx={{ fontSize: 48, color: "#64748b", mb: 0.5 }} />
                    <Box sx={{ textAlign: "center" }}>
                      <Typography sx={{ fontWeight: "bold !important", fontSize: 16, color: "#0f172a" }}>
                        {signingParty}
                      </Typography>
                      <Typography sx={{ fontSize: "11px", color: "#94a3b8" }}>
                        Personal
                      </Typography>
                    </Box>
                  </Box>

                  <Typography sx={{ fontSize: "11px", color: "#94a3b8", mb: 0.3, textAlign: "left" }}>
                    Domain
                  </Typography>
                  <Typography fontWeight={700} fontSize={13} color="#0f172a" sx={{ mb: 0.5, textAlign: "left" }}>
                    saml.singpass.gov.sg
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "#ef4444",
                      textDecoration: "underline",
                      mb: 1.5,
                      textAlign: "left",
                    }}
                  >
                    Does the domain look suspicious?
                  </Typography>

                  <Typography sx={{ fontSize: "11px", color: "#94a3b8", mb: 0.5, textAlign: "left" }}>
                    Match reference code
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 1, mb: 1.5 }}>
                    {refCode.split("").map((d, i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 52,
                          height: 60,
                          bgcolor: "#334155",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 30,
                            fontWeight: 900,
                            color: "white",
                            fontFamily: "monospace",
                            lineHeight: 1,
                          }}
                        >
                          {d}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ textAlign: "left" }}>
                    <Typography sx={{ fontSize: "11px", color: "#94a3b8" }}>
                      From
                    </Typography>
                    <Typography sx={{ fontWeight: "bold !important", fontSize: 14, color: "#0f172a" }}>
                          {application?.profile?.companyName ||
                          application?.singpass?.company?.companyName ||
                          application?.company_name ||
                          "Selected Company"}
                    </Typography>
                    <Typography fontSize={13} color="text.secondary" sx={{ mt: 0.5 }}>
                      Date: {new Date().toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => setShowPopup(false)}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 800,
                      px: 4,
                      flex: 1,
                      color: "#64748b",
                      borderColor: "#cbd5e1",
                      "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setScreen("processing")}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 800,
                      px: 4,
                      flex: 1,
                      bgcolor: "#ef4444",
                      "&:hover": { bgcolor: "#dc2626" },
                    }}
                  >
                    Sign
                  </Button>
                </Stack>
              </Box>
            ) : screen === "processing" ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  py: 6,
                  "@keyframes spin": {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                  },
                }}
              >
                <Box
                  sx={{
                    height: 120,
                    position: "relative",
                    width: 120,
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: "4px solid #ef4444",
                      borderTopColor: "transparent",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <EditNote sx={{ fontSize: 56, color: "#ef4444" }} />
                  </Box>
                </Box>
                <Typography sx={{ fontWeight: "bold !important", fontSize: 16, color: "#ef4444", mb: 1 }}>
                  SIGNING THE DOCUMENT
                </Typography>
                <Typography fontSize={13} color="text.secondary" sx={{ textAlign: "center" }}>
                  Keep this window open, this may take up to a minute
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography fontSize={14} color="text.secondary" sx={{ mb: 1 }}>
                  Check the document reference code in your app before signing
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 1.5 }}>
                  {refCode.split("").map((d, i) => (
                    <Box
                      key={i}
                      sx={{
                          width: 56,
                          height: 64,
                          bgcolor: "#334155",
                      borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 34,
                            fontWeight: 900,
                            color: "white",
                            fontFamily: "monospace",
                            lineHeight: 1,
                          }}
                        >
                          {d}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Typography sx={{ fontWeight: "bold !important", fontSize: 17, mb: 0 }}>
                    Scan with Singpass App
                  </Typography>
                <Typography fontSize={3} color="text.secondary" sx={{ lineHeight: 1.2, mb: 2.5 }}>
                  to sign document
                </Typography>

                <Box
                  onClick={() => setScreen("loading")}
                  sx={{
                    display: "inline-flex",
                    position: "relative",
                    p: 2.5,
                    bgcolor: "white",
                    borderRadius: 2,
                    border: "3px solid #ef4444",
                    cursor: "pointer",
                  }}
                >
                  <QRCode value="singpass:sign:uob-credit-ai-demo" size={180} />
                  <Typography
                    sx={{
                      position: "absolute",
                      bottom: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      px: 1.5,
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#ef4444",
                      bgcolor: "white",
                      lineHeight: 1,
                      zIndex: 1,
                    }}
                  >
                    singpass
                  </Typography>
                  <Box
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      bgcolor: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 900,
                      fontSize: 20,
                      lineHeight: 1,
                      zIndex: 1,
                    }}
                  >
                    i
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}