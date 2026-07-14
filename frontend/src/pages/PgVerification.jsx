import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Stack,
  Chip,
  Alert,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from "@mui/material";
import QRCode from "react-qr-code";
import PortalShell from "../components/PortalShell";
import { uob } from "../theme";
import { ageFromDob, demoIrasIncome, PG_MAX_AGE_AT_MATURITY } from "../lib/pg";

/** Mask an email like a•••@nexus.com.sg for the "invite sent" confirmation. */
function maskEmail(email, name) {
  if (email && email.includes("@")) return email;
  // Demo fallback when the keyman record carries no email.
  const handle = (name || "keyman").toLowerCase().replace(/[^a-z]/g, "").slice(0, 1);
  return `${handle}•••@company.com.sg`;
}

/**
 * Singpass QR authentication modal, reused for the applicant guarantor who is
 * present and can authenticate immediately. On completion it invokes onDone().
 */
function SingpassAuthDialog({ open, onClose, onDone, guarantorName }) {
  const [phase, setPhase] = useState("qr"); // qr | approving | done

  useEffect(() => {
    if (open) setPhase("qr");
  }, [open]);

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: "center", fontWeight: 900, pt: 3 }}>
        <Typography component="span" sx={{ color: "#ef4444", fontWeight: 950, fontSize: 24 }}>
          singpass
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ textAlign: "center", pb: 4 }}>
        {phase === "qr" && (
          <Box>
            <Typography fontSize={14} color="text.secondary" sx={{ mb: 2 }}>
              <strong>{guarantorName}</strong>, scan this code with your Singpass
              app to verify your identity and retrieve your IRAS income.
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                p: 2,
                border: "3px solid #ef4444",
                borderRadius: 3,
                bgcolor: "white",
                mb: 3,
              }}
            >
              <QRCode value={`UOB-PG-${guarantorName}`} size={160} />
            </Box>
            <Box sx={{ textAlign: "left", mb: 3 }}>
              <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: ".06em", mb: 1 }}>
                Singpass will share
              </Typography>
              {[
                "NRIC / FIN & Full Name",
                "Date of Birth",
                "IRAS Notice of Assessment (income)",
              ].map((item) => (
                <Typography key={item} sx={{ py: 0.5, fontSize: 14, borderBottom: "1px solid #f1f5f9" }}>
                  › {item}
                </Typography>
              ))}
              <Typography fontSize={12} color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.5 }}>
                Consent to a Credit Bureau (CBS) check is captured separately
                after your identity is verified.
              </Typography>
            </Box>
            <Button
              fullWidth
              variant="contained"
              color="error"
              sx={{ borderRadius: 2, py: 1.3, fontWeight: 900 }}
              onClick={() => {
                setPhase("approving");
                setTimeout(() => setPhase("done"), 1800);
              }}
            >
              Simulate scan & approve
            </Button>
          </Box>
        )}

        {phase === "approving" && (
          <Box sx={{ py: 5 }}>
            <CircularProgress sx={{ color: "#ef4444" }} />
            <Typography sx={{ mt: 3, fontWeight: 800, color: "#ef4444" }}>
              Authenticating with Singpass…
            </Typography>
            <Typography fontSize={13} color="text.secondary" sx={{ mt: 1 }}>
              Retrieving date of birth and IRAS NOA income.
            </Typography>
          </Box>
        )}

        {phase === "done" && (
          <Box sx={{ py: 4 }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                mx: "auto",
                borderRadius: "50%",
                bgcolor: "#16a34a",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                fontWeight: 900,
                mb: 2,
              }}
            >
              ✓
            </Box>
            <Typography fontWeight={900} sx={{ mb: 2 }}>
              Identity verified
            </Typography>
            <Button
              fullWidth
              variant="contained"
              sx={{ borderRadius: 2, py: 1.3, fontWeight: 900 }}
              onClick={() => {
                onDone();
                handleClose();
              }}
            >
              Continue
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Compact file picker used for the manual IC / IRAS NOA uploads. */
function UploadRow({ label, file, onPick }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: `1.5px solid ${file ? "#22c55e" : "#e5e7eb"}`,
        bgcolor: file ? "#f0fdf4" : "#fbfcff",
      }}
    >
      <Box>
        <Typography fontWeight={700} fontSize={14}>
          {label}
        </Typography>
        {file && (
          <Typography color="success.main" fontSize={12} sx={{ mt: 0.3, wordBreak: "break-word" }}>
            ✓ {file.name}
          </Typography>
        )}
      </Box>
      <Button
        component="label"
        size="small"
        variant={file ? "contained" : "outlined"}
        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", flexShrink: 0 }}
      >
        {file ? "Replace" : "Choose file"}
        <input
          hidden
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </Button>
    </Stack>
  );
}

export default function PgVerification({ application, setApplication, next, back, goHome }) {
  const profile = application.profile || {};
  const keymen = profile.keymen || [];
  const tenureYears = Math.ceil(Number(application.tenure || 0) / 12);
  const applicant = application.applicant || {};

  // The PGs selected on the previous (MyInfoReview) step.
  const guarantors = application.personalGuarantors || [];

  // Look up a guarantor's true MyInfo record (holds the DOB / email we may only
  // reveal once that person authenticates on their own).
  const keymanByName = useMemo(() => {
    const map = {};
    keymen.forEach((k) => {
      map[k.name] = k;
    });
    return map;
  }, [keymen]);

  // Is this guarantor the person currently logged in (the applicant)? Only they
  // can authenticate immediately; everyone else must be invited to do it
  // remotely via their own Singpass (or a manual upload).
  const isApplicant = (g) => applicant.isKeyman !== false && g.name === applicant.name;

  // Which guarantor's SingPass dialog is open (by name), if any.
  const [authFor, setAuthFor] = useState(null);
  // Which guarantors have opened the "No Singpass" manual path.
  const [manualOpen, setManualOpen] = useState({});

  const updateGuarantor = (name, patch) => {
    setApplication((prev) => ({
      ...prev,
      personalGuarantors: (prev.personalGuarantors || []).map((g) =>
        g.name === name ? { ...g, ...patch } : g
      ),
    }));
  };

  // Complete SingPass verification: reveal DOB, derive age, pull IRAS income.
  // CBS consent is NOT granted here — logging in only verifies identity and
  // income; the guarantor must consent to the credit-bureau check separately.
  const completeSingpass = (name) => {
    const record = keymanByName[name] || {};
    const dob = record.dob || null;
    updateGuarantor(name, {
      verified: true,
      method: "SINGPASS",
      dob,
      age: ageFromDob(dob),
      irasIncome: demoIrasIncome(record.nric || name),
      cbsConsent: false,
      inviteSent: false,
    });
  };

  // Manual path completion. Date of birth is OCR-extracted from the uploaded
  // IC (simulated from the keyman record for the demo), not entered by hand.
  // The IRAS NOA is an optional supporting document — if uploaded we surface
  // the income, otherwise it is simply left blank.
  const completeManual = (name) => {
    const g = guarantors.find((x) => x.name === name) || {};
    const record = keymanByName[name] || {};
    const dob = record.dob || null; // OCR-extracted from the IC
    updateGuarantor(name, {
      verified: true,
      method: "MANUAL",
      dob,
      age: ageFromDob(dob),
      irasIncome: g.irasFile ? demoIrasIncome(record.nric || name) : null,
      inviteSent: false,
    });
  };

  // Send the remote verification invite to a non-applicant guarantor's email.
  const sendInvite = (name) => {
    updateGuarantor(name, { inviteSent: true });
  };

  // Demo-only: simulate the invited guarantor completing verification remotely.
  // The remote guarantor grants CBS consent as part of their own remote flow,
  // so it arrives already granted here.
  const simulateRemote = (name) => {
    const record = keymanByName[name] || {};
    const dob = record.dob || null;
    updateGuarantor(name, {
      verified: true,
      method: "SINGPASS_REMOTE",
      dob,
      age: ageFromDob(dob),
      irasIncome: demoIrasIncome(record.nric || name),
      cbsConsent: true,
    });
  };

  // Only the IC upload and CBS consent are required. DOB comes from the IC via
  // OCR; the IRAS NOA is an optional supporting document.
  const manualReady = (g) => !!g.icFile && !!g.cbsConsent;

  // Every guarantor must be identity-verified AND have granted CBS consent
  // (a separate, explicit action) before the applicant can continue.
  const allVerified =
    guarantors.length > 0 && guarantors.every((g) => g.verified && g.cbsConsent);

  const handleContinue = () => {
    if (!allVerified) return;
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
            PERSONAL GUARANTOR VERIFICATION
          </Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.5, letterSpacing: "-0.02em" }}>
            Verify each personal guarantor
          </Typography>
          <Typography sx={{ opacity: 0.92, mt: 0.5, maxWidth: 760 }}>
            Each guarantor must confirm their own identity so we can retrieve
            their date of birth and IRAS income, and consent to a personal Credit
            Bureau (CBS) check. You can verify yourself instantly with Singpass;
            other guarantors will receive a secure link by email to complete this
            remotely on their own.
          </Typography>
        </Paper>

        {guarantors.length === 0 ? (
          <Alert severity="warning">
            No personal guarantors were selected. Go back and select at least one
            guarantor before continuing.
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {guarantors.map((g) => {
              const age = g.age;
              const ageAtMaturity = age != null ? age + tenureYears : null;
              const ageFlagged =
                ageAtMaturity != null && ageAtMaturity > PG_MAX_AGE_AT_MATURITY;
              const showManual = !!manualOpen[g.name];
              const applicantPg = isApplicant(g);
              const record = keymanByName[g.name] || {};

              return (
                <Paper
                  key={g.name}
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    border: `1.5px solid ${g.verified ? "#86efac" : "#e5e7eb"}`,
                    boxShadow: "0 10px 24px rgba(15,23,42,.06)",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                    spacing={1.5}
                  >
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                        <Typography fontWeight={900} sx={{ color: uob.ink }}>
                          {g.name}
                        </Typography>
                        {applicantPg && (
                          <Chip
                            size="small"
                            label="You (applicant)"
                            sx={{ bgcolor: "#e0e7ff", color: "#4338ca", fontWeight: 800 }}
                          />
                        )}
                        {g.verified ? (
                          <Chip
                            size="small"
                            label={
                              g.method === "MANUAL"
                                ? "✓ Verified (manual)"
                                : g.method === "SINGPASS_REMOTE"
                                  ? "✓ Verified remotely"
                                  : "✓ Verified via Singpass"
                            }
                            sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 800 }}
                          />
                        ) : g.inviteSent ? (
                          <Chip
                            size="small"
                            label="Invite sent — awaiting completion"
                            sx={{ bgcolor: "#dbeafe", color: "#1d4ed8", fontWeight: 800 }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label="Pending verification"
                            sx={{ bgcolor: "#fef3c7", color: "#b45309", fontWeight: 800 }}
                          />
                        )}
                      </Stack>
                      <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.3 }}>
                        {g.role || "Guarantor"} · {g.shareholding != null ? `${g.shareholding}% shareholding` : "—"}
                      </Typography>
                    </Box>

                    {/* Action buttons differ for the applicant vs. remote PGs. */}
                    {!g.verified && applicantPg && (
                      <Stack direction="row" spacing={1.5}>
                        <Button
                          variant="contained"
                          color="error"
                          sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
                          onClick={() => setAuthFor(g.name)}
                        >
                          Verify via Singpass
                        </Button>
                        <Button
                          variant="outlined"
                          sx={{ borderRadius: 2, fontWeight: 800 }}
                          onClick={() =>
                            setManualOpen((prev) => ({ ...prev, [g.name]: !prev[g.name] }))
                          }
                        >
                          No Singpass?
                        </Button>
                      </Stack>
                    )}

                    {!g.verified && !applicantPg && !g.inviteSent && (
                      <Button
                        variant="contained"
                        sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
                        onClick={() => sendInvite(g.name)}
                      >
                        Send verification link
                      </Button>
                    )}
                  </Stack>

                  {/* Remote invite pending state (non-applicant PG). */}
                  {!g.verified && !applicantPg && g.inviteSent && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          bgcolor: "#eff6ff",
                          border: "1px solid #bfdbfe",
                        }}
                      >
                        <Typography fontWeight={800} color="#1d4ed8" sx={{ mb: 0.5 }}>
                          ✉️ Secure verification link sent
                        </Typography>
                        <Typography fontSize={13} color="text.secondary">
                          We've emailed <strong>{g.name}</strong> at{" "}
                          {maskEmail(record.email, g.name)}. They'll log in with
                          their own Singpass (or upload their IC and IRAS NOA) and
                          grant CBS consent. This guarantor's details will appear
                          here once they complete it.
                        </Typography>
                        <Typography fontSize={12} color="#1d4ed8" fontWeight={700} sx={{ mt: 1.5, mb: 0.5 }}>
                          Demo mode
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 2, fontWeight: 800 }}
                          onClick={() => simulateRemote(g.name)}
                        >
                          Simulate remote completion
                        </Button>
                      </Box>
                    </>
                  )}

                  {/* Verified summary. For privacy, the guarantor's personal
                      data (date of birth, IRAS NOA income) is NOT shown in the
                      customer portal — it is captured and passed only to the
                      bank's credit approver. We surface just the compliance
                      status the applicant needs: age eligibility and CBS
                      consent. */}
                  {g.verified && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" },
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography fontSize={12} color="text.secondary" fontWeight={700}>
                            Identity & income
                          </Typography>
                          <Typography fontWeight={800} sx={{ color: "#15803d" }}>
                            Verified with the bank
                          </Typography>
                        </Box>
                        <Box>
                          <Typography fontSize={12} color="text.secondary" fontWeight={700}>
                            PG age eligibility
                          </Typography>
                          {ageAtMaturity == null ? (
                            <Typography fontWeight={800}>—</Typography>
                          ) : (
                            <Chip
                              size="small"
                              label={ageFlagged ? "Review" : "Eligible"}
                              sx={{
                                mt: 0.3,
                                fontWeight: 800,
                                bgcolor: ageFlagged ? "#fee2e2" : "#dcfce7",
                                color: ageFlagged ? "#b91c1c" : "#15803d",
                              }}
                            />
                          )}
                        </Box>
                        <Box>
                          <Typography fontSize={12} color="text.secondary" fontWeight={700}>
                            CBS consent
                          </Typography>
                          <Typography fontWeight={800} sx={{ color: g.cbsConsent ? "#15803d" : "#b45309" }}>
                            {g.cbsConsent ? "Granted" : "Pending"}
                          </Typography>
                        </Box>
                      </Box>

                      {/* CBS consent is a separate, explicit step — logging in
                          alone does not grant it. Prompt the applicant to
                          consent here. (Remote guarantors grant it in their own
                          flow, so it arrives already granted.) */}
                      {!g.cbsConsent && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 2,
                            borderRadius: 3,
                            bgcolor: "#fffbeb",
                            border: "1px solid #fde68a",
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={!!g.cbsConsent}
                                onChange={(e) =>
                                  updateGuarantor(g.name, { cbsConsent: e.target.checked })
                                }
                              />
                            }
                            label={
                              <Typography fontSize={14} sx={{ lineHeight: 1.5 }}>
                                <strong>Credit Bureau (CBS) consent.</strong> I
                                authorise the Bank to retrieve and review my
                                personal Credit Bureau report for this personal
                                guarantee.
                              </Typography>
                            }
                          />
                        </Box>
                      )}
                    </>
                  )}

                  {/* Manual (no Singpass) path — applicant only. */}
                  {!g.verified && applicantPg && showManual && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                        Manual verification (no Singpass)
                      </Typography>
                      <Stack spacing={1.5}>
                        <UploadRow
                          label="Identification Card (IC / NRIC)"
                          file={g.icFile}
                          onPick={(f) => f && updateGuarantor(g.name, { icFile: f })}
                        />
                        <UploadRow
                          label="IRAS Notice of Assessment — optional"
                          file={g.irasFile}
                          onPick={(f) => f && updateGuarantor(g.name, { irasFile: f })}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={!!g.cbsConsent}
                              onChange={(e) => updateGuarantor(g.name, { cbsConsent: e.target.checked })}
                            />
                          }
                          label={
                            <Typography fontSize={14} sx={{ lineHeight: 1.5 }}>
                              I authorise the Bank to retrieve and review my personal
                              Credit Bureau (CBS) report for this guarantee.
                            </Typography>
                          }
                        />
                        <Box>
                          <Button
                            variant="contained"
                            disabled={!manualReady(g)}
                            sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
                            onClick={() => completeManual(g.name)}
                          >
                            Submit verification
                          </Button>
                          {!manualReady(g) && (
                            <Typography fontSize={12} color="text.secondary" sx={{ mt: 1 }}>
                              Upload your IC and grant CBS consent to complete. The
                              IRAS NOA is optional.
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}

        {guarantors.length > 0 && !allVerified && (
          <Alert severity="info" sx={{ mt: 3 }}>
            All selected guarantors must complete verification before you can
            continue.
          </Alert>
        )}

        <Paper sx={{ p: 3, mt: 3, borderRadius: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button variant="outlined" sx={{ borderRadius: 3, px: 4 }} onClick={back}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleContinue}
              disabled={!allVerified}
              sx={{ borderRadius: 3, px: 5, fontWeight: 800 }}
            >
              Confirm &amp; continue
            </Button>
          </Stack>
        </Paper>
      </Box>

      <SingpassAuthDialog
        open={!!authFor}
        guarantorName={authFor || ""}
        onClose={() => setAuthFor(null)}
        onDone={() => authFor && completeSingpass(authFor)}
      />
    </PortalShell>
  );
}
