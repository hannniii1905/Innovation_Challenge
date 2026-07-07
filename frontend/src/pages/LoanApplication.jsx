import { useState } from "react";
import CompanyInformation from "../components/application/CompanyInformation";
import LoanCalculator from "../components/application/LoanCalculator";
import AdditionalDeclarations from "../components/application/AdditionalDeclarations";
import DocumentUploader from "../components/application/DocumentUploader";
import ConsentSection from "../components/application/ConsentSection";
import PortalShell from "../components/PortalShell";
import { Button, Box, Typography, Paper, Stack } from "@mui/material";

const steps = ["Loan Details", "Questionnaire", "Documents", "Consent"];

export default function LoanApplication({ application, setApplication, next, back }) {
  const [step, setStep] = useState(0);

  const validateDocuments = () => {
    // Only the corporate bank statement is mandatory. IC, financials and the
    // income statement are optional supporting docs that can be uploaded later.
    if (!application.uploads.bankStatement) {
      alert("Please upload your Corporate Bank Statement.");
      return false;
    }
    return true;
  };

  const validateConsent = () => {
    const consent = application.consent || {};
    if (!consent.creditBureau || !consent.acra || !consent.screening || !consent.declaration) {
      alert("Please complete all declaration and consent items before submitting.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
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
    <PortalShell application={application}>
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
          {step !== 1 && (
            <>
              <Typography
                color="#005EB8"
                sx={{ mb: 1, fontWeight: 700, fontSize: 14 }}
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

              <Typography color="text.secondary" sx={{ mt: 1.2, fontSize: 15 }}>
                Complete each section of your business loan application.
              </Typography>
            </>
          )}

          <Box sx={{ display: "flex", gap: 1.5, mt: step !== 1 ? 3 : 0 }}>
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
              {step === 4 ? "Submit Application" : "Continue"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </PortalShell>
  );
}