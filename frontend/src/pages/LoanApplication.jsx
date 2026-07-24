import { useState } from "react";
import CompanyInformation from "../components/application/CompanyInformation";
import LoanCalculator from "../components/application/LoanCalculator";
import AdditionalDeclarations from "../components/application/AdditionalDeclarations";
import DocumentUploader from "../components/application/DocumentUploader";
import ConsentSection from "../components/application/ConsentSection";
import PortalShell from "../components/PortalShell";
import { Button, Box, Typography, Paper, Stack } from "@mui/material";

const FULL_STEPS = ["Loan Details", "Additional Declarations", "Documents", "Consent"];
// Bukku lane: bank data comes from the partner feed and identity is already
// verified, so the Documents and Consent steps are dropped.
const BUKKU_STEPS = ["Loan Details", "Additional Declarations"];

export default function LoanApplication({ application, setApplication, next, back, goHome }) {
  const [step, setStep] = useState(0);
  const isBukku = application.lane === "BUKKU";
  const steps = isBukku ? BUKKU_STEPS : FULL_STEPS;

  const validateDocuments = () => {
    // Only the corporate bank statement is mandatory. IC, financials and the
    // income statement are optional supporting docs that can be uploaded later.
    const bankStatements = application.uploads.bankStatements || [];
    if (bankStatements.length < 6) {
      alert("Please upload all 6 monthly corporate bank statements before proceeding.");
      return false;
    }
    return true;
  };

  const validateDeclarations = () => {
    const d = application.declarations || {};
    if (!d.positiveEBITDA || !d.positiveTNW || !d.existingLoans || !d.recentDefault) {
      alert("Please answer all declaration questions before proceeding.");
      return false;
    }
    if (d.existingLoans === "yes" && !d.existingLoanDetails?.trim()) {
      alert("Please provide details of your existing loans or banking facilities.");
      return false;
    }
    return true;
  };

  const validateConsent = () => {
    const consent = application.consent || {};
    if (!consent.screening || !consent.declaration) {
      alert("Please complete all declaration and consent items before submitting.");
      return false;
    }
    if (!consent.singpassSigned) {
      alert("Please sign the application via Singpass before submitting.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateDeclarations()) return;

    // Bukku lane ends after Declarations — no Documents / Consent steps.
    if (isBukku) {
      if (step === steps.length - 1) {
        next();
        return;
      }
      setStep((prev) => prev + 1);
      return;
    }

    if (step === 2 && !validateDocuments()) return;
    if (step === 3) {
      if (!validateConsent()) return;
      next();
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      back();
      return;
    }
    setStep((prev) => prev - 1);
  };

  return (
    <PortalShell application={application} onHome={goHome}>
      <Box>
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: 4,
            borderRadius: 4,
            border: "1px solid #e5e7eb",
            boxShadow: "0 12px 28px rgba(15,23,42,.06)",
          }}
        >
          <>
            <Typography
              sx={{
                mb: 1,
                fontWeight: 700,
                fontSize: 14,
                color: "#0f172a",
              }}
            >
              Business Financing Application
            </Typography>

            <Typography
              sx={{
                fontSize: 28,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {steps[step]}
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mt: 1.2,
                fontSize: 15,
              }}
            >
              {step === 1
                ? "Please provide the following declarations for the initial credit assessment."
                : "Complete each section of your business loan application."}
            </Typography>
          </>

          <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
            {steps.map((label, index) => (
              <Box
                key={label}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 99,
                  bgcolor: index <= step ? "#005EB8" : "#e5e7eb",
                }}
              />
            ))}
          </Box>
        </Paper>

        {/* {step === 0 && <CompanyInformation application={application} />} */}

        {step === 0 && (
          <LoanCalculator
            application={application}
            setApplication={setApplication}
          />
        )}

        {step === 1 && (
          <AdditionalDeclarations
            application={application}
            setApplication={setApplication}
          />
        )}

        {step === 2 && (
          <DocumentUploader
            application={application}
            setApplication={setApplication}
          />
        )}

        {step === 3 && (
          <ConsentSection
            application={application}
            setApplication={setApplication}
          />
        )}

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mt: 3,
            borderRadius: 4,
            border: "1px solid #e5e7eb",
            bgcolor: "white",
          }}
        >
          <Stack direction="row" justifyContent="space-between">
            <Button
              variant="outlined"
              size="large"
              sx={{ borderRadius: 3, px: 4 }}
              onClick={handleBack}
            >
              Back
            </Button>

            <Button
              variant="contained"
              size="large"
              sx={{
                borderRadius: 3,
                px: 5,
                fontWeight: 700,
                background: "linear-gradient(90deg, #005EB8 0%, #0072CE 100%)",
              }}
              onClick={handleNext}
            >
              {step === steps.length - 1 ? "Submit Application" : "Continue"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </PortalShell>
  );
}