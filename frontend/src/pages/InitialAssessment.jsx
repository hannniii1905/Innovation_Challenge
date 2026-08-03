import { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Chip,
} from "@mui/material";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import { submitApplication } from "../api/client";

export default function InitialAssessment({
  application,
  setApplication,
  uploadSupportingDocs,
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
            `APP-2026-${String(response.application_id || 1).padStart(
              6,
              "0"
            )}`,

          ai_recommendation:
            response.ai_recommendation ||
            response.evaluation_status ||
            response.decision ||
            response.status ||
            "REFER_TO_RM",

          recommended_amount:
            response.recommended_offer ||
            response.recommended_amount ||
            response.approved_amount ||
            application.loanAmount,

          requested_amount:
            response.requested_quantum ||
            response.requested_amount ||
            application.loanAmount ||
            0,

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
  }, [application, setApplication]);

  if (loading) {
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
            width: 700,
            maxWidth: "100%",
            p: 6,
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 88,
              height: 88,
              mx: "auto",
              mb: 3,
              borderRadius: "50%",
              bgcolor: "#eaf3ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HourglassTopRoundedIcon
              sx={{
                color: "#005eb8",
                fontSize: 46,
              }}
            />
          </Box>

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
            Initial assessment in progress...
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
          p: 3,
        }}
      >
        <Paper
          elevation={4}
          sx={{
            width: 700,
            maxWidth: "100%",
            p: 6,
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 88,
              height: 88,
              mx: "auto",
              mb: 3,
              borderRadius: "50%",
              bgcolor: "#fff1f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ErrorOutlineRoundedIcon
              sx={{
                color: "#b42318",
                fontSize: 48,
              }}
            />
          </Box>

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

  const recommendation = String(
    assessment?.ai_recommendation || ""
  ).toUpperCase();

  const requestedAmount = Number(assessment?.requested_amount || 0);

  const isApproved =
    recommendation === "APPROVE" ||
    recommendation === "APPROVED" ||
    recommendation === "AUTO_APPROVED";

  const isRejected =
    recommendation === "REJECT" ||
    recommendation === "REJECTED" ||
    recommendation === "DECLINE" ||
    recommendation === "DECLINED";

  const isAutoDecisionAmount = requestedAmount < 200000;

  let icon;
  let pageHeading;
  let title;
  let subtitle;
  let chipColor;
  let statusLabel;
  let statusColor;

  if (isApproved) {
    icon = (
      <Box
        sx={{
          width: 88,
          height: 88,
          mx: "auto",
          borderRadius: "50%",
          bgcolor: "#e8f7ee",
          border: "2px solid #36a269",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 22px rgba(54, 162, 105, 0.16)",
        }}
      >
        <CheckCircleOutlineRoundedIcon
          sx={{
            color: "#278759",
            fontSize: 50,
          }}
        />
      </Box>
    );

    pageHeading = "Application Approved";

    title = isAutoDecisionAmount
      ? "Automatically Approved"
      : "Approved";

    subtitle = isAutoDecisionAmount
      ? "Congratulations! Based on our automated assessment, your UOB BizMoney application has been approved.\n\nOur team will contact you with the next steps required to complete the facility setup and disbursement process."
      : "Congratulations! Your UOB BizMoney application has been approved.\n\nOur team will contact you with the next steps required to complete the facility setup and disbursement process.";

    chipColor = "success";
    statusLabel = "Approved";
    statusColor = "#278759";
  } else if (isRejected) {
    icon = (
      <Box
        sx={{
          width: 88,
          height: 88,
          mx: "auto",
          borderRadius: "50%",
          bgcolor: "#f3f4f6",
          border: "2px solid #9ca3af",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 20px rgba(107, 114, 128, 0.12)",
        }}
      >
        <MarkEmailReadRoundedIcon
          sx={{
            color: "#667085",
            fontSize: 46,
          }}
        />
      </Box>
    );

    pageHeading = "Initial Assessment Complete";
    title = "Application Not Approved";

    subtitle =
      "Thank you for your interest in UOB BizMoney.\n\nAfter careful review, we regret to inform you that we are currently unable to approve your loan application as it does not meet our credit criteria at this time.\n\nYour business may qualify in the future. We encourage you to reapply once your financial position has strengthened.";

    chipColor = "default";
    statusLabel = "Not Approved";
    statusColor = "#667085";
  } else {
    icon = (
      <Box
        sx={{
          width: 88,
          height: 88,
          mx: "auto",
          borderRadius: "50%",
          bgcolor: "#eaf3ff",
          border: "2px solid #2e7bef",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 22px rgba(46, 123, 239, 0.15)",
        }}
      >
        <ManageSearchRoundedIcon
          sx={{
            color: "#2e7bef",
            fontSize: 48,
          }}
        />
      </Box>
    );

    pageHeading = "Application Submitted";
    title = "Under Credit Approver Review";

    subtitle =
      "Thank you for your interest in UOB BizMoney.\n\nYour application requires further assessment and has been routed to a Credit Approver for review. Our team will contact you within 1 business day.";

    chipColor = "info";
    statusLabel = "Pending Credit Review";
    statusColor = "#2e7bef";
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
          maxWidth: "100%",
          borderRadius: 4,
          p: {
            xs: 3,
            sm: 6,
          },
          textAlign: "center",
        }}
      >
        {icon}

        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{
            mt: 3,
            color: "#202124",
          }}
        >
          {pageHeading}
        </Typography>

        <Chip
          label={title}
          color={chipColor}
          sx={{
            mt: 3,
            px: 1,
            fontSize: 16,
            fontWeight: 700,
            height: 38,
          }}
        />

        <Typography
          sx={{
            mt: 4,
            whiteSpace: "pre-line",
            color: "text.secondary",
            fontSize: 16,
            lineHeight: 1.7,
            maxWidth: 650,
            mx: "auto",
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
            borderRadius: 3,
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

          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              color: statusColor,
            }}
          >
            {statusLabel}
          </Typography>

          {isApproved && assessment.recommended_amount && (
            <>
              <Typography color="text.secondary" sx={{ mt: 3 }}>
                Approved Facility Amount
              </Typography>

              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{ color: "#278759" }}
              >
                ${Number(assessment.recommended_amount).toLocaleString()}
              </Typography>
            </>
          )}
        </Paper>

        {!isRejected && !isApproved && (
          <Typography
            color="text.secondary"
            fontSize={14}
            sx={{
              mt: 5,
              maxWidth: 610,
              mx: "auto",
            }}
          >
            You may upload additional supporting documents while your
            application is being reviewed.
          </Typography>
        )}

        <Box
          sx={{
            mt: isRejected || isApproved ? 5 : 2,
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {!isRejected && !isApproved && (
            <Button
              variant="outlined"
              size="large"
              onClick={uploadSupportingDocs}
            >
              Upload Supporting Documents
            </Button>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={backToHome}
            sx={{
              minWidth: 150,
            }}
          >
            Return Home
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}