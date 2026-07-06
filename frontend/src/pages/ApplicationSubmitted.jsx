import {
  Box,
  Paper,
  Typography,
  Button
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function ApplicationSubmitted({
  application,
  backToHome
}) {

  const referenceNumber =
    application?.referenceNumber || "APP-20260001";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fa",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 3
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: 700,
          p: 6,
          borderRadius: 4,
          textAlign: "center"
        }}
      >
        <CheckCircleIcon
          color="success"
          sx={{
            fontSize: 90,
            mb: 2
          }}
        />

        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
        >
          Application Submitted
        </Typography>

        <Typography
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Thank you for your application.
          <br />
          Your documents have been received successfully and are currently under review.
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mb: 4,
            bgcolor: "#fafafa"
          }}
        >
          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Reference Number
          </Typography>

          <Typography
            variant="h6"
            fontWeight="bold"
            gutterBottom
          >
            {referenceNumber}
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mt: 2 }}
          >
            Current Status
          </Typography>

          <Typography
            variant="h6"
            color="primary"
            fontWeight="bold"
          >
            Under Review
          </Typography>
        </Paper>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          A credit approver is reviewing your application.
          <br />
          You will be notified once a decision has been made.
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={backToHome}
        >
          Return to Home
        </Button>
      </Paper>
    </Box>
  );
}