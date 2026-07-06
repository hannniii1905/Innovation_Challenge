import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  Alert,
} from "@mui/material";
import DocumentUploader from "../components/application/DocumentUploader";
import {
  getApplicationDocuments,
  uploadSupportingDocuments,
} from "../api/client";

export default function SupportingDocuments({
  application,
  setApplication,
  backToHome,
}) {
  const applicationId = application.applicationId;
  const referenceNumber = application.referenceNumber;

  const [onFile, setOnFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Load what's already on file so the client sees what's outstanding.
  useEffect(() => {
    if (!applicationId) return;
    getApplicationDocuments(applicationId)
      .then((res) => setOnFile(res.documents))
      .catch(() => {});
  }, [applicationId]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await uploadSupportingDocuments(applicationId, {
        ic: application.uploads.ic,
        financials: application.uploads.financials,
        incomeStatement: application.uploads.incomeStatement,
      });
      setOnFile(res.documents);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to upload documents.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6f9", py: 5, px: 3 }}>
      <Box sx={{ maxWidth: 1000, mx: "auto" }}>
        <Paper sx={{ p: 4, borderRadius: 4, mb: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={900}>
                Add supporting documents
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Your application has been submitted. You can upload supporting
                documents now or come back any time before final approval.
              </Typography>
            </Box>
            {referenceNumber && (
              <Chip
                label={`Ref: ${referenceNumber}`}
                sx={{ fontWeight: 800, bgcolor: "#e6f0fa", color: "#005EB8" }}
              />
            )}
          </Stack>

          {onFile && (
            <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", gap: 1 }}>
              {[
                ["Bank statement", onFile.bank_statement],
                ["IC", onFile.ic],
                ["Financials", onFile.financials],
                ["Income statement", onFile.income_statement],
              ].map(([label, name]) => (
                <Chip
                  key={label}
                  size="small"
                  label={`${label}: ${name ? "on file" : "not provided"}`}
                  sx={{
                    fontWeight: 700,
                    bgcolor: name ? "#dcfce7" : "#f1f5f9",
                    color: name ? "#15803d" : "#64748b",
                  }}
                />
              ))}
            </Box>
          )}
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        {saved && !error && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Supporting documents uploaded successfully.
          </Alert>
        )}

        <DocumentUploader
          application={application}
          setApplication={setApplication}
          supportingOnly
        />

        <Paper sx={{ p: 3, mt: 3, borderRadius: 4 }}>
          <Stack direction="row" justifyContent="space-between">
            <Button variant="outlined" sx={{ borderRadius: 3, px: 4 }} onClick={backToHome}>
              Back to home
            </Button>
            <Button
              variant="contained"
              disabled={saving}
              onClick={handleSave}
              sx={{
                borderRadius: 3,
                px: 5,
                fontWeight: 800,
                background: "linear-gradient(90deg, #005EB8 0%, #0072CE 100%)",
              }}
            >
              {saving ? "Uploading…" : "Upload documents"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
