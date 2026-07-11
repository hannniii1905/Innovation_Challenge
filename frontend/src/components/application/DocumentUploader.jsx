import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Paper,
  Chip,
  Stack,
  CircularProgress,
} from "@mui/material";

import { detectBankStatementPeriod } from "../../api/client";

const MAX_BANK_STATEMENTS = 6;

const toMonthIndex = (year, month) =>
  Number(year) * 12 + Number(month) - 1;

const getMonthLabel = (monthIndex) => {
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex % 12;

  return new Date(year, month, 1).toLocaleDateString("en-SG", {
    month: "short",
    year: "numeric",
  });
};

export default function DocumentUploader({
  application,
  setApplication,
  supportingOnly = false,
}) {
  const [uploadError, setUploadError] = useState("");

  const uploads = application?.uploads || {};
  const bankStatements = uploads.bankStatements || [];
  const applicationId = application?.applicationId || application?.application_id || null;

  const uploadSingleFile = (field, file) => {
    if (!file) return;

    setApplication((previous) => ({
      ...previous,
      uploads: {
        ...(previous?.uploads || {}),
        [field]: file,
      },
    }));
  };

  const updateBankStatement = (statementId, updates) => {
    setApplication((previous) => ({
      ...previous,
      uploads: {
        ...(previous?.uploads || {}),
        bankStatements: (
          previous.uploads?.bankStatements || []
        ).map((statement) =>
          statement.id === statementId
            ? { ...statement, ...updates }
            : statement
        ),
      },
    }));
  };

  const detectStatementPeriod = async (statement) => {
    try {
      const result = await detectBankStatementPeriod(statement.file);
      const period = result?.statement_period || {};

      updateBankStatement(statement.id, {
        month: period.month ?? null,
        year: period.year ?? null,
        startDate: period.start_date ?? null,
        endDate: period.end_date ?? null,
        periodLabel:
          period.label ||
          period.period_label ||
          "Statement period not detected",
        status: period.detected === false ? "failed" : "detected",
      });
    } catch (error) {
      console.error("Statement-period detection failed:", error);

      updateBankStatement(statement.id, {
        month: null,
        year: null,
        periodLabel:
          error?.message || "Unable to detect statement period",
        status: "failed",
      });
    }
  };

  const handleBankStatementsChange = (event) => {
    setUploadError("");

    const selectedFiles = Array.from(event.target.files || []);
    const existingFiles =
      application?.uploads?.bankStatements || [];

    const remainingSlots =
      MAX_BANK_STATEMENTS - existingFiles.length;

    if (remainingSlots <= 0) {
      setUploadError(
        "A maximum of 6 corporate bank statements can be uploaded."
      );
      event.target.value = "";
      return;
    }

    const validPdfFiles = selectedFiles.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );

    if (validPdfFiles.length !== selectedFiles.length) {
      setUploadError(
        "Only PDF files are accepted for corporate bank statements."
      );
    }

    const filesToAdd = validPdfFiles.slice(0, remainingSlots);

    if (validPdfFiles.length > remainingSlots) {
      setUploadError(
        `Only ${remainingSlots} more bank statement${
          remainingSlots === 1 ? "" : "s"
        } can be uploaded.`
      );
    }

    const newStatements = filesToAdd.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      filename: file.name,
      month: null,
      year: null,
      startDate: null,
      endDate: null,
      periodLabel: "Detecting statement period…",
      status: "detecting",
    }));

    setApplication((previous) => ({
      ...previous,
      uploads: {
        ...(previous?.uploads || {}),
        bankStatements: [
          ...(previous.uploads?.bankStatements || []),
          ...newStatements,
        ],
      },
    }));

    newStatements.forEach((statement) => {
      detectStatementPeriod(statement);
    });

    event.target.value = "";
  };

  const removeBankStatement = (statementId) => {
    setUploadError("");

    setApplication((previous) => ({
      ...previous,
      uploads: {
        ...(previous?.uploads || {}),
        bankStatements: (
          previous.uploads?.bankStatements || []
        ).filter((statement) => statement.id !== statementId),
      },
    }));
  };

  const detectedPeriodKeys = useMemo(
    () =>
      bankStatements
        .filter(
          (statement) =>
            statement.status === "detected" &&
            statement.month &&
            statement.year
        )
        .map(
          (statement) =>
            `${statement.year}-${String(statement.month).padStart(
              2,
              "0"
            )}`
        ),
    [bankStatements]
  );

  const duplicatePeriodKeys = useMemo(() => {
    const seen = new Set();
    const duplicates = new Set();

    detectedPeriodKeys.forEach((periodKey) => {
      if (seen.has(periodKey)) {
        duplicates.add(periodKey);
      }

      seen.add(periodKey);
    });

    return duplicates;
  }, [detectedPeriodKeys]);

  const hasDuplicateMonths = duplicatePeriodKeys.size > 0;

  const statementPeriodValidation = useMemo(() => {
    const detectedStatements = bankStatements.filter(
      (statement) =>
        statement.status === "detected" &&
        statement.month &&
        statement.year
    );

    if (bankStatements.length < MAX_BANK_STATEMENTS) {
      return {
        valid: false,
        type: "incomplete",
        message: `Upload ${MAX_BANK_STATEMENTS - bankStatements.length} more monthly statement${
          MAX_BANK_STATEMENTS - bankStatements.length === 1 ? "" : "s"
        }.`,
      };
    }

    if (detectedStatements.length < MAX_BANK_STATEMENTS) {
      return {
        valid: false,
        type: "undetected",
        message:
          "The month and year must be detected for all 6 bank statements.",
      };
    }

    const monthIndexes = detectedStatements
      .map((statement) =>
        toMonthIndex(statement.year, statement.month)
      )
      .sort((a, b) => a - b);

    const uniqueMonthIndexes = [...new Set(monthIndexes)];

    if (uniqueMonthIndexes.length !== MAX_BANK_STATEMENTS) {
      return {
        valid: false,
        type: "duplicate",
        message:
          "Each bank statement must cover a different monthly period.",
      };
    }

    const consecutive = uniqueMonthIndexes.every(
      (monthIndex, index) =>
        index === 0 ||
        monthIndex === uniqueMonthIndexes[index - 1] + 1
    );

    if (!consecutive) {
      return {
        valid: false,
        type: "gap",
        message:
          "The 6 bank statements must cover consecutive months without any gaps.",
      };
    }

    const today = new Date();

    // Last fully completed month.
    const latestCompletedMonthIndex =
      today.getFullYear() * 12 + today.getMonth() - 1;

    const latestUploadedMonthIndex =
      uniqueMonthIndexes[uniqueMonthIndexes.length - 1];

    // Allow the six-month window to end either:
    // 1. last completed month, or
    // 2. one month before last completed month.
    const acceptableEndMonths = [
      latestCompletedMonthIndex,
      latestCompletedMonthIndex - 1,
    ];

    if (!acceptableEndMonths.includes(latestUploadedMonthIndex)) {
      return {
        valid: false,
        type: "stale",
        message: `Statements must cover the latest available 6-month period, ending in ${getMonthLabel(
          latestCompletedMonthIndex
        )} or ${getMonthLabel(latestCompletedMonthIndex - 1)}.`,
      };
    }

    return {
      valid: true,
      type: "valid",
      message: `Valid 6-month period: ${getMonthLabel(
        uniqueMonthIndexes[0]
      )} to ${getMonthLabel(latestUploadedMonthIndex)}.`,
    };
  }, [bankStatements]);

  const SingleUploadBox = ({
    icon,
    title,
    field,
    helper,
    required,
  }) => {
    const uploaded = uploads[field];

    return (
      <Paper
        elevation={0}
        sx={{
          height: "100%",
          p: 4,
          borderRadius: 4,
          border: uploaded
            ? "1.5px solid #22c55e"
            : "1.5px solid #e5e7eb",
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
          sx={{
            fontSize: 16,
            fontWeight: 800,
            color: "#0f172a",
            mb: 1,
          }}
        >
          {title}
        </Typography>

        <Typography
          color="text.secondary"
          fontSize={13}
          sx={{ minHeight: 42 }}
        >
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
            onChange={(event) =>
              uploadSingleFile(
                field,
                event.target.files?.[0]
              )
            }
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
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            {supportingOnly
              ? "Supporting Documents"
              : "Documents"}
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.8, fontSize: 14 }}
          >
            {supportingOnly
              ? "Add any supporting documents. These are optional and can be provided at any time."
              : "Upload the latest 6 months of corporate bank statements. Supporting documents are optional and can be uploaded later."}
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          {uploadError && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              {uploadError}
            </Alert>
          )}

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

              <Paper
                elevation={0}
                sx={{
                  height: "100%",
                  p: 4,
                  borderRadius: 4,
                  border:
                    bankStatements.length > 0
                      ? "1.5px solid #22c55e"
                      : "1.5px solid #e5e7eb",
                  bgcolor:
                    bankStatements.length > 0
                      ? "#f0fdf4"
                      : "#fbfcff",
                  textAlign: "center",
                  transition: ".2s",
                  "&:hover": {
                    borderColor: "#0072CE",
                    boxShadow: "0 10px 24px rgba(0,94,184,.12)",
                  },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                  <Chip
                    size="small"
                    label="Required"
                    sx={{
                      fontWeight: 800,
                      fontSize: 11,
                      bgcolor: "#fee2e2",
                      color: "#b91c1c",
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
                  🏦
                </Box>

                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                    mb: 1,
                  }}
                >
                  Corporate Bank Statements
                </Typography>

                <Typography
                  color="text.secondary"
                  fontSize={13}
                  sx={{ minHeight: 42, maxWidth: 430, mx: "auto" }}
                >
                  Upload the latest 6 months of corporate bank statements. The statement
                  month and year will be detected automatically.
                </Typography>

                <Typography
                  sx={{
                    mt: 1,
                    fontSize: 12,
                    fontWeight: 800,
                    color:
                      bankStatements.length >= MAX_BANK_STATEMENTS
                        ? "#b91c1c"
                        : "#64748b",
                  }}
                >
                  {bankStatements.length} of {MAX_BANK_STATEMENTS} uploaded
                </Typography>

                <Button
                  component="label"
                  variant={bankStatements.length > 0 ? "contained" : "outlined"}
                  disabled={bankStatements.length >= MAX_BANK_STATEMENTS}
                  sx={{
                    mt: 2.5,
                    borderRadius: 3,
                    px: 2.5,
                    textTransform: "none",
                    fontWeight: 800,
                  }}
                >
                  {bankStatements.length > 0 ? "Add More Files" : "Choose Files"}

                  <input
                    hidden
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleBankStatementsChange}
                  />
                </Button>

                {bankStatements.length > 0 && (
                  <Stack spacing={1.2} sx={{ mt: 2.5, textAlign: "left" }}>
                    {bankStatements.map((statement) => {
                      const periodKey =
                        statement.year && statement.month
                          ? `${statement.year}-${String(statement.month).padStart(2, "0")}`
                          : null;

                      const isDuplicate =
                        periodKey && duplicatePeriodKeys.has(periodKey);

                      return (
                        <Box
                          key={statement.id}
                          sx={{
                            p: 1.5,
                            borderRadius: 2.5,
                            bgcolor: isDuplicate ? "#fff7ed" : "#ffffff",
                            border: `1px solid ${
                              isDuplicate
                                ? "#fed7aa"
                                : statement.status === "failed"
                                ? "#fecaca"
                                : "#dbe3ee"
                            }`,
                          }}
                        >
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            spacing={1.5}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontSize={13} fontWeight={800} noWrap>
                                {statement.filename}
                              </Typography>

                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.8}
                                sx={{ mt: 0.4 }}
                              >
                                {statement.status === "detecting" && (
                                  <CircularProgress size={13} thickness={5} />
                                )}

                                <Typography
                                  fontSize={12}
                                  sx={{
                                    color:
                                      statement.status === "failed"
                                        ? "#b91c1c"
                                        : statement.status === "detected"
                                        ? "#15803d"
                                        : "#64748b",
                                    fontWeight: 700,
                                  }}
                                >
                                  {statement.periodLabel}
                                </Typography>

                                {isDuplicate && (
                                  <Chip
                                    label="Duplicate month"
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: 10,
                                      fontWeight: 800,
                                      bgcolor: "#ffedd5",
                                      color: "#c2410c",
                                    }}
                                  />
                                )}
                              </Stack>
                            </Box>

                            <Button
                              size="small"
                              color="error"
                              onClick={() => removeBankStatement(statement.id)}
                              sx={{
                                minWidth: 0,
                                textTransform: "none",
                                fontWeight: 800,
                              }}
                            >
                              Remove
                            </Button>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}

                {hasDuplicateMonths && (
                  <Alert severity="warning" sx={{ mt: 2, textAlign: "left" }}>
                    Two or more uploaded statements cover the same month. Please
                    upload statements for distinct monthly periods.
                  </Alert>
                )}
                {bankStatements.length > 0 && !hasDuplicateMonths && (
                  <Alert
                    severity={
                      statementPeriodValidation.valid
                        ? "success"
                        : statementPeriodValidation.type === "incomplete" ||
                          statementPeriodValidation.type === "undetected"
                        ? "info"
                        : "warning"
                    }
                    sx={{ mt: 2, textAlign: "left" }}
                  >
                    {statementPeriodValidation.message}
                  </Alert>
                )}
              </Paper>
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
              <SingleUploadBox
                icon="📊"
                title="Company Financial Statements"
                field="financials"
                helper="Upload the latest management accounts or audited financials."
              />
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: "#f0f7ff",
              border: "1px solid #bfdbfe",
            }}
          >
            <Typography fontSize={13} color="#1d4ed8">
              Each personal guarantor's identity document and
              IRAS Notice of Assessment are collected separately
              during identity verification.
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}