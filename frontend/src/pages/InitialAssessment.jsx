import { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Chip,
} from "@mui/material";
import { submitApplication } from "../api/client";

export default function InitialAssessment({
  application,
  setApplication,
  backToHome,
}) {
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);

  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    const runAssessment = async () => {
      try {
        const response = await submitApplication(application);

        const normalised = {
          reference_number:
            response.reference_number ||
            `APP-2026-${String(response.application_id || 1).padStart(6, "0")}`,

          ai_recommendation:
            response.ai_recommendation ||
            response.evaluation_status ||
            response.decision ||
            "APPROVE",

          recommended_amount:
            response.recommended_offer ||
            response.recommended_amount ||
            response.approved_amount ||
            application.loanAmount,

          raw_result: response,
        };

        setAssessment(normalised);

        setApplication((prev) => ({
          ...prev,
          applicationId: response.application_id,
          referenceNumber: normalised.reference_number,
          assessment: normalised,
        }));
      } catch (err) {
        console.error("Assessment error:", err);
        setError(err.message || "Unable to complete assessment.");
      } finally {
        setLoading(false);
      }
    };

    runAssessment();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#f4f6f9",
        }}
      >
        <Paper
          elevation={4}
          sx={{
            width: 700,
            p: 6,
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 80, marginBottom: 16 }}>⏳</div>

          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Application Submitted
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 5 }}>
            Your application has been received successfully.
            <br />
            <br />
            Please wait while we complete your initial assessment.
          </Typography>

          <CircularProgress size={60} />

          <Typography sx={{ mt: 4 }}>
            Initial Assessment in Progress...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#f4f6f9",
        }}
      >
        <Paper
          elevation={4}
          sx={{
            width: 700,
            p: 6,
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 80, marginBottom: 16 }}>⚠️</div>

          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Submission Error
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {error}
          </Typography>

          <Button variant="contained" onClick={backToHome}>
            Return Home
          </Button>
        </Paper>
      </Box>
    );
  }

  const recommendation = assessment?.ai_recommendation;

  let icon;
  let title;
  let subtitle;
  let chipColor;

  if (recommendation === "APPROVE" || recommendation === "APPROVED") {
    icon = <div style={{ fontSize: 80 }}>✅</div>;
    title = "Preliminarily Approved";
    subtitle =
      "Congratulations! Based on our initial automated assessment, your application has been preliminarily approved.\n\nYour application is now pending a final review by one of our Credit Approvers before the facility can be formally approved.";
    chipColor = "success";
  } else {
    icon = <div style={{ fontSize: 80 }}>🟡</div>;
    title = "Needs Further Review";
    subtitle =
      "Your application has successfully completed its initial assessment.\n\nA Credit Approver will review your application and contact you if any additional information is required.";
    chipColor = "warning";
  } 

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "#f4f6f9",
        p: 3,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: 760,
          borderRadius: 4,
          p: 6,
          textAlign: "center",
        }}
      >
        {icon}

        <Typography variant="h4" fontWeight="bold" sx={{ mt: 2 }}>
          Initial Assessment Complete
        </Typography>

        <Chip
          label={title}
          color={chipColor}
          sx={{ mt: 3, fontSize: 16, height: 36 }}
        />

        <Typography
          sx={{
            mt: 4,
            whiteSpace: "pre-line",
            color: "text.secondary",
          }}
        >
          {subtitle}
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            mt: 5,
            p: 3,
            bgcolor: "#fafafa",
          }}
        >
          <Typography color="text.secondary">
            Reference Number
          </Typography>

          <Typography variant="h6" fontWeight="bold">
            {assessment.reference_number}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 3 }}>
            Current Status
          </Typography>

          <Typography variant="h6" color="primary">
            Pending Final Credit Approval
          </Typography>

          {assessment.recommended_amount && (
            <>
              <Typography color="text.secondary" sx={{ mt: 3 }}>
                Indicative Facility Amount
              </Typography>

              <Typography variant="h6" fontWeight="bold">
                ${Number(assessment.recommended_amount).toLocaleString()}
              </Typography>
            </>
          )}
        </Paper>

        <Button
          variant="contained"
          size="large"
          sx={{ mt: 5 }}
          onClick={backToHome}
        >
          Return Home
        </Button>
      </Paper>
    </Box>
  );
}