import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Paper,
  Chip,
} from "@mui/material";

export default function DocumentUploader({
  application,
  setApplication,
  supportingOnly = false,
}) {
  const upload = (field, file) => {
    if (!file) return;

    setApplication((prev) => ({
      ...prev,
      uploads: {
        ...prev.uploads,
        [field]: file,
      },
    }));
  };

  const UploadBox = ({ icon, title, field, helper, required }) => {
    const uploaded = application.uploads[field];

    return (
      <Paper
        elevation={0}
        sx={{
          height: "100%",
          p: 4,
          borderRadius: 4,
          border: uploaded ? "1.5px solid #22c55e" : "1.5px solid #e5e7eb",
          bgcolor: uploaded ? "#f0fdf4" : "#fbfcff",
          textAlign: "center",
          transition: ".2s",
          "&:hover": {
            borderColor: "#0072CE",
            boxShadow: "0 10px 24px rgba(0,94,184,.12)",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 1.5,
          }}
        >
          <Chip
            size="small"
            label={required ? "Required" : "Optional"}
            sx={{
              fontWeight: 800,
              fontSize: 11,
              bgcolor: required ? "#fee2e2" : "#e6f0fa",
              color: required ? "#b91c1c" : "#005EB8",
            }}
          />
        </Box>

        <Box
          sx={{
            width: 46,
            height: 46,
            mx: "auto",
            mb: 2,
            borderRadius: 3,
            bgcolor: "#e6f0fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          {icon}
        </Box>

        <Typography
          variant="h7"
          sx={{
            fontWeight: 800,
            color: "#0f172a",
            mb: 1,
          }}
        >
          {title}
        </Typography>
        <Typography color="text.secondary" fontSize={13} sx={{ minHeight: 42 }}>
          {helper}
        </Typography>

        <Button
          variant={uploaded ? "contained" : "outlined"}
          component="label"
          sx={{
            mt: 3,
            borderRadius: 3,
            fontWeight: 700,
            textTransform: "none",
          }}
        >
          {uploaded ? "Replace File" : "Choose File"}
          <input
            hidden
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => upload(field, e.target.files?.[0])}
          />
        </Button>

        {uploaded && (
          <Typography
            color="success.main"
            sx={{
              mt: 2,
              fontSize: 13,
              fontWeight: 600,
              wordBreak: "break-word",
            }}
          >
            ✓ {uploaded.name}
          </Typography>
        )}
      </Paper>
    );
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 5,
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 28px rgba(15,23,42,.06)",
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
            {supportingOnly ? "Supporting Documents" : "Documents"}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.8, fontSize: 14 }}>
            {supportingOnly
              ? "Add any supporting documents. These are optional and can be provided at any time."
              : "Only the corporate bank statement is required to submit. Supporting documents are optional and can be uploaded later."}
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          {!supportingOnly && (
            <Box sx={{ mb: 4 }}>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  mb: 2,
                }}
              >
                Required
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <UploadBox
                    icon="🏦"
                    title="Corporate Bank Statement"
                    field="bankStatement"
                    helper="Upload your latest corporate bank statement."
                    required
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              mb: 2,
            }}
          >
            Supporting Documents (optional)
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <UploadBox
                icon="🪪"
                title="NRIC / Identification Card"
                field="ic"
                helper="Upload the key person’s identification document."
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <UploadBox
                icon="📊"
                title="Company Financials"
                field="financials"
                helper="Upload management accounts or audited financials."
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <UploadBox
                icon="📄"
                title="IRAS Income Statement"
                field="incomeStatement"
                helper="Upload your latest income or tax supporting document."
              />
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}