import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  CircularProgress,
  Stack,
  Divider,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
} from "@mui/material";
import {
  getApproverApplication,
  submitApproverDecision,
  getApplicationFileUrl,
  getGuarantorFileUrl,
  getAiDecision,
} from "../api/client";

import LightKycPanel from "../components/LightKycPanel";

export default function CreditDecisionWorkbench({ applicationSummary, back, onDecision, onViewTampering, onViewLitigation, onViewRiskFlag, goHome }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approverNotes, setApproverNotes] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [aiDecision, setAiDecision] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const applicationId = applicationSummary?.application_id;

  useEffect(() => {
    async function loadApplication() {
      try {
        const data = await getApproverApplication(applicationId);
        setApplication(data);
      } catch (err) {
        setError(err.message || "Unable to load application.");
      } finally {
        setLoading(false);
      }
    }

    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);

  useEffect(() => {
    async function loadAiDecision() {
      if (!applicationId) return;
      setAiLoading(true);
      try {
        const data = await getAiDecision(applicationId);
        setAiDecision(data);
      } catch {
        setAiDecision(null);
      } finally {
        setAiLoading(false);
      }
    }
    loadAiDecision();
  }, [applicationId]);

  const formatCurrency = (value) => {
    if (!value && value !== 0) return "-";
    return `$${Number(value).toLocaleString()}`;
  };
  
  const handleDecision = async (decision) => {
    try {
      setDecisionLoading(true);

      const approvedAmount =
        decision === "APPROVED"
          ? application.requested_quantum
          : decision === "SUBJECT TO APPROVAL"
          ? application.recommended_amount
          : 0;

      const result = await submitApproverDecision(
        application.application_id,
        decision,
        approvedAmount,
        approverNotes
      );

      setApplication((prev) => ({
        ...prev,
        status: result.status,
        approver_decision: result.approver_decision,
        approved_amount: result.approved_amount,
        approver_notes: result.approver_notes,
      }));

      alert("Decision recorded successfully.");
      onDecision?.(application, decision);
      back();
    } catch (err) {
      alert(err.message || "Failed to record decision.");
    } finally {
      setDecisionLoading(false);
    }
  };
  const decisionLabel = application?.system_decision || "PENDING_REVIEW";

  const decisionColor =
    decisionLabel === "APPROVED"
      ? "success"
      : decisionLabel === "REJECTED"
      ? "error"
      : "warning";

  const uw = application?.underwriting || {};
  const fin = uw.financials || {};
  const cbs = uw.credit_bureau || {};
  const singpass = application?.singpass_profile || {};
  const companyProfile = application?.company_profile || {};
  const businessInfo =
    application?.business_info ||
    singpass.businessInfo ||
    singpass.business_info ||
    {};
  const propertyOwnership =
    singpass.propertyOwnership ||
    singpass.property_ownership ||
    application?.propertyOwnership ||
    application?.property_ownership ||
    companyProfile.propertyOwnership ||
    companyProfile.property_ownership ||
    "";
  const rentAmount =
    singpass.rentAmount ||
    singpass.rent_amount ||
    application?.rentAmount ||
    application?.rent_amount ||
    companyProfile.rentAmount ||
    companyProfile.rent_amount ||
    0;
  const registeredAddress =
    companyProfile.registered_address ||
    companyProfile.registeredAddress ||
    businessInfo.registeredAddress ||
    businessInfo.registered_address ||
    businessInfo.primarySsic ||
    businessInfo.primary_ssic ||
    "";
  const profileDirectors =
    companyProfile.directors ||
    singpass.keymen ||
    application?.personal_guarantors ||
    [];

  const directorNames = profileDirectors
    .map((director) =>
      typeof director === "string"
        ? director
        : director?.name || director?.fullName
    )
    .filter(Boolean);


  const incorporationDate =
    companyProfile.incorporation_date ||
    uw.acra?.registration_date ||
    singpass.incorporationDate ||
    "—";

  const displayRiskFlags = [
    ...new Set(
      (application?.risk_flags || []).map((flag) => {
        if (
          flag === "Credit-kiting patterns detected" ||
          flag === "Bank statement integrity flag"
        ) {
          return "Credit-kiting detected";
        }

        if (flag === "AML / blacklist hit") {
          return "Light KYC review required";
        }

        return flag;
      })
    ),
  ];
  
  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f6f8fc" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f6f8fc" }}>
        <Paper sx={{ p: 5, borderRadius: 4, textAlign: "center" }}>
          <Typography color="error" sx={{ mb: 3 }}>{error}</Typography>
          <Button variant="contained" onClick={back}>Back</Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f6f8fc", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <Box sx={{ background: "linear-gradient(120deg, #001A3F 0%, #002E5D 45%, #005EB8 100%)", color: "white", px: 4, py: 4 }}>
        <Box sx={{ maxWidth: 1250, mx: "auto" }}>
          <Stack direction="row" alignItems="center" spacing={0.7} onClick={goHome} sx={{ cursor: "pointer", mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, opacity: 0.8, letterSpacing: "0.02em", "&:hover": { opacity: 1 } }}>
              UOB Credit AI
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={back} sx={{ mb: 2, bgcolor: "white", borderColor: "white" }}>
            ← Back to Work Queue
          </Button>

          <Typography sx={{ fontSize: 30, fontWeight: 850, letterSpacing: "-0.03em" }}>
            Credit Decision Workbench
          </Typography>

          <Typography sx={{ mt: 1, opacity: 0.9 }}>
            Review AI recommendation, risk factors and supporting evidence before recording final decision.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1250, mx: "auto", p: 4 }}>
        <CompanyOverview
          application={application}
          companyProfile={companyProfile}
          directorNames={directorNames}
          incorporationDate={incorporationDate}
          decisionLabel={decisionLabel}
          decisionColor={decisionColor}
          propertyOwnership={propertyOwnership}
          rentAmount={rentAmount}
          registeredAddress={registeredAddress}
        />        

        <EvidenceSection application={application} formatCurrency={formatCurrency} onViewTampering={onViewTampering} onViewLitigation={onViewLitigation} />

        <FinalAssessmentSummary
          application={application}
          displayRiskFlags={displayRiskFlags}
          onViewTampering={onViewTampering}
          onViewLitigation={onViewLitigation}
          onViewRiskFlag={onViewRiskFlag}
          aiDecision={aiDecision}
          aiLoading={aiLoading}
        />

        <ApproverActionPanel
          application={application}
          approverNotes={approverNotes}
          setApproverNotes={setApproverNotes}
          decisionLoading={decisionLoading}
          handleDecision={handleDecision}
        />
      </Box>
    </Box>
  );
}

function ApproverActionPanel({
  application,
  approverNotes,
  setApproverNotes,
  decisionLoading,
  handleDecision,
}) {
  return (
    <Panel title="Approver Action">
      <Grid container spacing={3} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Record the final credit decision after reviewing the evidence and
            automated recommendation.
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Approver Notes"
            placeholder="Add rationale, conditions, or follow-up instructions."
            value={approverNotes}
            onChange={(event) => setApproverNotes(event.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={1.3}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              disabled={decisionLoading}
              sx={{ borderRadius: 3, fontWeight: 850, py: 1.2 }}
              onClick={() => handleDecision("APPROVED")}
            >
              Approve
            </Button>

            <Button
              variant="contained"
              color="warning"
              fullWidth
              disabled={decisionLoading}
              sx={{ borderRadius: 3, fontWeight: 850, py: 1.2 }}
              onClick={() => handleDecision("SUBJECT TO APPROVAL")}
            >
              Counter-offer / Subject to Approval
            </Button>

            <Button
              variant="contained"
              color="error"
              fullWidth
              disabled={decisionLoading}
              sx={{ borderRadius: 3, fontWeight: 850, py: 1.2 }}
              onClick={() => handleDecision("REJECTED")}
            >
              Reject
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Panel>
  );
}

function FinalAssessmentSummary({
  application,
  displayRiskFlags,
  onViewTampering,
  onViewLitigation,
  onViewRiskFlag,
  aiDecision,
  aiLoading,
}) {
  const decisionConfig = {
    APPROVED: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "✓" },
    REJECTED: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "✕" },
    "SUBJECT TO APPROVAL": { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "!" },
  };

  const cfg = decisionConfig[aiDecision?.decision] || decisionConfig["SUBJECT TO APPROVAL"];

  return (
    <Panel title="Final Assessment Summary">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 900,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              mb: 1.5,
            }}
          >
            AI Decision &amp; Rationale
          </Typography>

          {aiLoading ? (
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "#f8fafc",
                border: "1px dashed #cbd5e1",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <CircularProgress size={22} sx={{ color: "#005EB8" }} />
                <Typography color="text.secondary" fontSize={14} fontWeight={500}>
                  Generating AI assessment...
                </Typography>
              </Box>
              <LinearProgress sx={{ borderRadius: 2, height: 6, bgcolor: "#e2e8f0" }} />
            </Box>
          ) : aiDecision ? (
            <Stack spacing={0}>
              {/* Decision card */}
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: cfg.bg,
                  border: `1.5px solid ${cfg.border}`,
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: cfg.color,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    {cfg.icon}
                  </Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 900, color: cfg.color, letterSpacing: "-0.01em" }}>
                    {aiDecision.decision}
                  </Typography>
                </Box>
                {aiDecision.provider === "huggingface" && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#005EB8" }} />
                    <Typography fontSize={11} color="#64748b" sx={{ fontWeight: 500 }}>
                      Powered by AI
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Rationale */}
              <Box sx={{ px: 0.5, mb: 2.5 }}>
                <Typography
                  color="#334155"
                  sx={{ lineHeight: 1.85, fontSize: 14, fontWeight: 400 }}
                >
                  {aiDecision.rationale}
                </Typography>
              </Box>

              {/* Key factors */}
              {aiDecision.key_factors?.length > 0 && (
                <Box>
                  <Typography
                    fontSize={12}
                    fontWeight={900}
                    color="#64748b"
                    sx={{ mb: 1, textTransform: "uppercase", letterSpacing: ".06em" }}
                  >
                    Key Factors
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.8}>
                    {aiDecision.key_factors.map((f, i) => {
                      const isRisk = f.toLowerCase().includes("high") || f.toLowerCase().includes("risk") || f.toLowerCase().includes("kiting") || f.toLowerCase().includes("suspicious");
                      const isGood = f.toLowerCase().includes("strong") || f.toLowerCase().includes("good") || f.toLowerCase().includes("approved");
                      const chipColor = isRisk ? "#dc2626" : isGood ? "#16a34a" : "#475569";
                      const chipBg = isRisk ? "#fef2f2" : isGood ? "#f0fdf4" : "#f1f5f9";
                      return (
                        <Chip
                          key={i}
                          label={f}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: 12,
                            bgcolor: chipBg,
                            color: chipColor,
                            border: `1px solid ${chipColor}22`,
                            height: 28,
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ lineHeight: 1.8, fontSize: 14 }}>
              {application.system_reason}
            </Typography>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 900,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              mb: 1,
            }}
          >
            Key Risk Flags
          </Typography>

          {displayRiskFlags.length > 0 ? (
            <Stack spacing={1}>
              {displayRiskFlags.map((flag, index) => {
                const flagLower = flag.toLowerCase();

                const isCreditKiting =
                  flagLower.includes("credit-kiting") ||
                  flagLower.includes("bank statement integrity");

                const isLitigation =
                  flagLower.includes("litigation") ||
                  flagLower.includes("charge");

                return (
                  <Button
                    key={`${flag}-${index}`}
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      if (isCreditKiting) {
                        onViewTampering?.(application);
                      } else if (isLitigation) {
                        onViewLitigation?.(application);
                      } else {
                        onViewRiskFlag?.(flag, application);
                      }
                    }}
                    sx={{
                      p: 1.35,
                      borderRadius: 2.5,
                      justifyContent: "flex-start",
                      textTransform: "none",
                      borderColor: "#fecaca",
                      bgcolor: "#fffafa",
                      "&:hover": {
                        bgcolor: "#fef2f2",
                        borderColor: "#fca5a5",
                      },
                    }}
                  >
                    <Typography
                      fontSize={13}
                      fontWeight={800}
                      color="#b91c1c"
                      textAlign="left"
                    >
                      ⚠ {flag}
                    </Typography>
                  </Button>
                );
              })}
            </Stack>
          ) : (
            <Box
              sx={{
                p: 1.8,
                borderRadius: 2.5,
                bgcolor: "#f0fdf4",
                border: "1px solid #bbf7d0",
              }}
            >
              <Typography fontSize={13} fontWeight={800} color="#15803d">
                No material risk flags identified.
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Panel>
  );
}

function Panel({ title, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 4,
        border: "1px solid #e2e7ef",
        boxShadow: "0 6px 18px rgba(15,23,42,.05)",
        mb: 3,
        width: "100%",
      }}
    >
      {title && (
        <Typography sx={{ fontSize: 17, fontWeight: 700, mb: 2 }}>
          {title}
        </Typography>
      )}

      {children}
    </Paper>
  );
}
function CompanyOverview({
  application,
  companyProfile,
  directorNames,
  directorContacts,
  incorporationDate,
  decisionLabel,
  decisionColor,
  propertyOwnership,
  rentAmount,
  registeredAddress,
}) {
  const cbs = application?.underwriting?.credit_bureau || {};
  const bankStatementDocuments = Array.isArray(
    application?.files?.bank_statements
  )
    ? [...application.files.bank_statements]
        .filter((file) => file && typeof file === "object")
        .sort((a, b) => {
          const aMonth = Number(a.year || 0) * 12 + Number(a.month || 0);
          const bMonth = Number(b.year || 0) * 12 + Number(b.month || 0);
          return aMonth - bMonth;
        })
        .map((file, position) => {
          const fileIndex = file.index ?? position;
          const label = file.label
            ? file.label
            : file.year && file.month
            ? `${new Date(
                Number(file.year),
                Number(file.month) - 1,
                1
              ).toLocaleDateString("en-SG", {
                month: "short",
                year: "numeric",
              })}`
            : `Corporate Bank Statement ${position + 1}`;

          return {
            key: `bank_statement_${fileIndex}`,
            label,
            filename: file.filename,
            documentType: "bank_statement",
            fileIndex,
          };
        })
    : [];

  const supportingDocuments = [
    { key: "income_statement", label: "IRAS Income Statement" },
    { key: "financials", label: "Company Financials" },
    { key: "ic", label: "NRIC / ID Copy" },
  ]
    .filter((doc) => application?.files?.[doc.key])
    .map((doc) => ({
      ...doc,
      filename: application.files[doc.key],
      documentType: doc.key,
      fileIndex: null,
    }));

  const documents = [...bankStatementDocuments, ...supportingDocuments];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 4,
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 28px rgba(15,23,42,.08)",
        mb: 4,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "flex-start" }}
        spacing={3}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "-0.025em",
            }}
          >
            {application.company_name}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {application.reference_number} · UEN {application.uen}
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1.2}
          flexWrap="wrap"
          useFlexGap
          justifyContent={{ xs: "flex-start", md: "flex-end" }}
        >
          <Chip
            label={decisionLabel}
            color={decisionColor}
            sx={{ fontWeight: 850 }}
          />

        </Stack>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={1.6}>
        {[
          {
            label: "Industry",
            value: companyProfile.industry || application.industry || "—",
            size: { xs: 12, md: 4 },
          },
          {
            label: "Incorporation Date",
            value: incorporationDate,
            size: { xs: 12, sm: 6, md: 2 },
          },
          {
            label: "Company Status",
            value: companyProfile.company_status || "Live Company",
            size: { xs: 12, sm: 6, md: 2 },
          },
          {
            label: "Requested Loan",
            value: `$${Number(
              application.requested_quantum || 0
            ).toLocaleString()}`,
            size: { xs: 12, sm: 6, md: 2 },
          },
          {
            label: "Loan Tenure",
            value:
              application.loan_tenure_months != null
                ? `${application.loan_tenure_months} months`
                : "—",
            size: { xs: 12, sm: 6, md: 2 },
          },
          {
            label: "Business Premises",
            value:
              propertyOwnership === "owned"
                ? (
                    <>
                      Owned by company
                      {registeredAddress ? <br /> : null}
                      {registeredAddress}
                    </>
                  )
                : propertyOwnership === "rented"
                ? (
                    <>
                      Rented · S$${Number(rentAmount || 0).toLocaleString()} monthly
                      {registeredAddress ? <br /> : null}
                      {registeredAddress}
                    </>
                  )
                : registeredAddress
                ? registeredAddress
                : "—",
            size: { xs: 12, md: 4 },
          },
          {
            label: "Directors",
            value:
              directorNames.length > 0
                ? directorNames.join(", ")
                : "No director information available",
            size: { xs: 12, md: 6.5 },
          },
          {
            label: "Credit Bureau Score",
            value: (() => {
              const grade = cbs.grade;
              if (!grade) return "—";
              const fail = ["HH", "HX", "HZ"].includes(grade);
              return (
                <span style={{ color: fail ? "#dc2626" : "#16a34a", fontWeight: 850 }}>
                  {grade}
                </span>
              );
            })(),
            size: { xs: 12, sm: 6, md: 2.5 },
          },
        ].map((item) => (
          <Grid key={item.label} size={item.size}>
            <ProfileStat
              label={item.label}
              value={item.value}
            />
          </Grid>
        ))}
      </Grid>



      {documents.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            sx={{ mb: 1.8 }}
          >
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
                Supporting Documents
              </Typography>

              <Typography
                fontSize={13}
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                Documents submitted with this application.
              </Typography>
            </Box>

            <Chip
              label={`${documents.length} uploaded`}
              size="small"
              sx={{
                fontWeight: 850,
                bgcolor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
              }}
            />
          </Stack>

          <Grid container spacing={1.4}>
            {documents.map((doc) => (
              <Grid key={doc.key} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box
                  sx={{
                    px: 1.7,
                    py: 1.3,
                    minHeight: 64,
                    height: "100%",
                    borderRadius: 2.25,
                    bgcolor: "#ffffff",
                    border: "1px solid #dbe3ee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1.5,
                    transition: "border-color 0.15s ease",
                    "&:hover": {
                      borderColor: "#93c5fd",
                    },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {doc.label}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontSize: 11.5,
                        color: "#64748b",
                      }}
                    >
                      PDF document
                    </Typography>
                  </Box>

                  <Button
                    size="small"
                    variant="text"
                    href={getApplicationFileUrl(
                      application.application_id,
                      doc.documentType,
                      doc.fileIndex
                    )}
                    target="_blank"
                    sx={{
                      flexShrink: 0,
                      minWidth: 0,
                      px: 1,
                      textTransform: "none",
                      fontWeight: 800,
                    }}
                  >
                    Open ↗
                  </Button>
                </Box>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Paper>
  );
}

function CompanyField({ label, value }) {
  return (
    <Box
      sx={{
        p: 2,
        height: "100%",
        minHeight: 92,
        borderRadius: 3,
        bgcolor: "#f8fafc",
        border: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 900,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt: 0.8,
          fontSize: 16,
          fontWeight: 850,
          color: "#0f172a",
          lineHeight: 1.45,
          overflowWrap: "anywhere",
        }}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
}

function ProfileStat({ label, value }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.7,
        minHeight: 78,
        height: "100%",
        borderRadius: 2.5,
        bgcolor: "#f8fafc",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: ".055em",
          color: "#64748b",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt: 0.65,
          fontSize: 16,
          fontWeight: 750,
          color: "#0f172a",
          lineHeight: 1.35,
          overflowWrap: "anywhere",
        }}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
}

function FinancialIndicatorsPanel({ application, fin, formatCurrency }) {
  const dscrValue = fin.dscr != null ? Number(fin.dscr) : application.dscr != null ? Number(application.dscr) : null;
  const fccValue = fin.fcc != null ? Number(fin.fcc) : application.fcc != null ? Number(application.fcc) : null;
  const existingDebtValue = fin.existing_debt != null ? Number(fin.existing_debt) : application.existing_debt != null ? Number(application.existing_debt) : null;
  const mueValue = fin.mue != null ? Number(fin.mue) : application.mue != null ? Number(application.mue) : null;
  const dscrOk = dscrValue == null ? null : dscrValue >= 1.25;
  const fccOk = fccValue == null ? null : fccValue > 1;

  const formatValue = (value, prefix = "", suffix = "") => {
    if (value == null || Number.isNaN(value)) return "—";
    return `${prefix}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
  };

  const statusChip = (ok, passLabel, failLabel) => {
    if (ok == null) return null;
    return (
      <Chip
        label={ok ? passLabel : failLabel}
        size="small"
        sx={{
          borderRadius: 50,
          px: 1.5,
          py: 0.5,
          fontWeight: 800,
          color: ok ? "#0f5f34" : "#7f1d1d",
          bgcolor: ok ? "#ecfdf5" : "#fef2f2",
          border: ok ? "1px solid #bbf7d0" : "1px solid #fecaca",
        }}
      />
    );
  };

  return (
    <Panel title="Financial Indicators">
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Annualised Revenue"
            value={formatValue(fin.annualised_revenue ?? application.annualised_revenue, "$")}
            caption="True adjusted turnover annualised"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="DSCR"
            value={formatValue(dscrValue)}
            valueColor={dscrOk === false ? "#991b1b" : "#0f172a"}
            caption={dscrOk == null ? "Awaiting input" : dscrOk ? "Healthy coverage" : "Below 1.25 target"}
            badge={statusChip(dscrOk, "Good", "Review")}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="FCC"
            value={formatValue(fccValue)}
            valueColor={fccOk === false ? "#991b1b" : "#0f172a"}
            caption={fccOk == null ? "Awaiting input" : fccOk ? "Adequate coverage" : "Needs improvement"}
            badge={statusChip(fccOk, "Pass", "Review")}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Monthly Debt Service"
            value={formatValue(fin.monthly_debt_service, "$")}
            caption="Loan + other monthly obligations"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="MUE"
            value={formatValue(mueValue, "$")}
            caption="On-us debt exposure less collateral"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Serviceable Income"
            value={formatValue(fin.serviceable_income, "$")}
            caption="Industry-adjusted cash flow"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Existing Debt"
            value={formatValue(existingDebtValue, "$")}
            caption="Annualised existing liability"
          />
        </Grid>

      </Grid>
    </Panel>
  );
}

function MetricCard({ label, value, caption, badge, valueColor }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "#ffffff",
        border: "1px solid #e2e7ef",
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box>
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 900,
            fontFamily: "inherit",
            color: "#0f172a",
            lineHeight: 1.35,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            mt: 0.65,
            fontSize: 16,
            fontWeight: 400,
            fontFamily: "inherit",
            color: valueColor || "#0f172a",
            lineHeight: 1.3,
          }}
        >
          {value}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 1,
          mt: 1.25,
        }}
      >
        <Typography
          sx={{
            flex: 1,
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.45,
          }}
        >
          {caption}
        </Typography>

        {badge}
      </Box>
    </Box>
  );
}

function SummaryRow({ label, value }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: 3, alignItems: "center" }}>
      <Typography color="text.secondary">{label}</Typography>
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        {typeof value === "string" ? (
          <Typography fontWeight={700} textAlign="right">{value}</Typography>
        ) : (
          value
        )}
      </Box>
    </Box>
  );
}

function PassChip({ passed, passLabel = "Pass", failLabel = "Review" }) {
  return (
    <Chip
      size="small"
      label={passed ? passLabel : failLabel}
      sx={{
        fontWeight: 800,
        bgcolor: passed ? "#dcfce7" : "#fee2e2",
        color: passed ? "#15803d" : "#b91c1c",
      }}
    />
  );
}

function RatioTile({ label, value, ok, hint }) {
  const color = ok == null ? "#0f172a" : ok ? "#15803d" : "#b91c1c";
  const bg = ok == null ? "#f8fafc" : ok ? "#f0fdf4" : "#fef2f2";
  return (
    <Box sx={{ p: 2, borderRadius: 3, bgcolor: bg, border: "1px solid #e5e7eb", height: "100%" }}>
      <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 900, color, mt: 0.5 }}>{value}</Typography>
      {hint && <Typography fontSize={11} color="text.secondary">{hint}</Typography>}
    </Box>
  );
}

function groupDeductions(items) {
  const map = new Map();
  for (const it of items) {
    const key = `${it.lender}||${it.amount}||${it.description}`;
    if (!map.has(key)) {
      map.set(key, { lender: it.lender, description: it.description, amount: it.amount, months: 0 });
    }
    map.get(key).months += 1;
  }
  return Array.from(map.values());
}

function EvidenceSection({ application, formatCurrency, onViewTampering, onViewLitigation }) {
  const uw = application.underwriting || {};
  const bank = uw.bank_ocr || {};
  const cbs = uw.credit_bureau || {};
  const acra = uw.acra || {};
  const litigation = uw.litigation || {};
  const aml = uw.aml || {};
  const lightKyc = uw.light_kyc || {};

const acraShareholders = Array.isArray(acra.shareholders)
  ? acra.shareholders
  : [];

const storedGuarantors = Array.isArray(application.personal_guarantors)
  ? application.personal_guarantors
  : [];

  // Prefer the actual selected guarantors.
  // Fall back to ACRA shareholders for older/demo applications.
  const guarantorSource =
    storedGuarantors.length > 0
      ? storedGuarantors
      : acraShareholders;

  const pgs = guarantorSource.map((person) => ({
    ...person,

    name:
      person.name ||
      person.fullName ||
      person.full_name ||
      "Unknown shareholder",

    shareholding: Number(
      person.shareholding ??
      person.shareholding_percentage ??
      person.percentage ??
      0
    ),
  }));

  const calculatedPgCoverage = pgs.reduce(
    (total, person) =>
      total + Number(person.shareholding || 0),
    0
  );

  const storedPgCoverage = Number(
    application.pg_coverage ?? 0
  );

  const pgCoverage =
    storedPgCoverage > 0
      ? storedPgCoverage
      : calculatedPgCoverage;

  const pgCoverageOk =
    pgs.length > 0 && pgCoverage >= 50;

  const agesKnown = pgs.some((p) => p.age != null);
  // Only judge ages that are actually known. A null age means the guarantor is
  // not yet verified — that's a "pending", not an implicit pass.
  const pgAgesOk = pgs.filter((p) => p.age != null).every((p) => p.age < 70);
  const allPgVerified = pgs.length > 0 && pgs.every((p) => p.verified);
  const allPgCbsConsent = pgs.length > 0 && pgs.every((p) => p.cbsConsent);

  const fin = uw.financials || {};
  const kiting = uw.credit_kiting || {};
  const debt = uw.existing_debt || {};
  const flaggedVolume = Number(
    bank.flagged_kiting_volume ||
      kiting.flagged_volume ||
      0
  );

  const totalStatementCredits = Number(bank.total_credits || 0);

  const trueAdjustedTurnover = Math.max(
    0,
    totalStatementCredits - flaggedVolume
  );

  const flaggedPercentage =
    totalStatementCredits > 0
      ? (flaggedVolume / totalStatementCredits) * 100
      : 0;

  const rm = uw.risk_model || {};
  const pd = rm.pd_percent;
  const band = rm.rating_band;
  const cueScore = Number(rm.cue_score ?? 14);
  const cuePassed =
    rm.cue_passed !== undefined
      ? Boolean(rm.cue_passed)
      : cueScore <= 12;

  const bandColor =
    band === "Low" || band === "Moderate"
      ? { bg: "#dcfce7", fg: "#15803d", bar: "#16a34a" }
      : band === "Elevated"
      ? { bg: "#fef3c7", fg: "#b45309", bar: "#d97706" }
      : { bg: "#fee2e2", fg: "#b91c1c", bar: "#dc2626" };

  return (
    <>
      {/* Credit Flash Model — PD + approved limit */}
      {rm.pd_percent != null && (
        <Panel title={`${rm.model_name || "Credit Risk Model"} — Probability of Default`}>
          <Grid container spacing={3.5} alignItems="stretch">
            <Grid size={{ xs: 12, md: 5.5 }}>
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography
                    sx={{
                      fontSize: 58,
                      fontWeight: 950,
                      color: bandColor.fg,
                      lineHeight: 1,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {pd}%
                  </Typography>

                  <Chip
                    label={`${band} risk`}
                    sx={{
                      fontWeight: 900,
                      bgcolor: bandColor.bg,
                      color: bandColor.fg,
                      px: 1,
                    }}
                  />
                </Stack>

                <Typography color="text.secondary" fontSize={14} sx={{ mt: 1 }}>
                  12-month probability of default · {rm.model_name} {rm.model_version || ""}
                </Typography>

                {/* KEEPING YOUR ORIGINAL COLOURED BAR */}
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Number(pd) || 0)}
                  sx={{
                    mt: 2,
                    height: 10,
                    borderRadius: 99,
                    bgcolor: "#e5e7eb",
                    "& .MuiLinearProgress-bar": { bgcolor: bandColor.bar },
                  }}
                />
              </Box>
            </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Box
              sx={{
                height: "100%",
                minHeight: 205,
                p: 3,
                borderRadius: 4,
                bgcolor: cuePassed ? "#f0fdf4" : "#fff7ed",
                border: `1px solid ${cuePassed ? "#bbf7d0" : "#fed7aa"}`,
                display: "grid",
                gridTemplateRows: "22px 52px 1px auto",
                rowGap: 1.4,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: cuePassed ? "#047857" : "#c2410c",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  lineHeight: "22px",
                }}
              >
                CUE Score
              </Typography>

              <Stack
                direction="row"
                alignItems="center"
                spacing={0.8}
                sx={{ height: 52 }}
              >
                <Typography
                  sx={{
                    fontSize: 34,
                    fontWeight: 950,
                    color: cuePassed ? "#047857" : "#c2410c",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {cueScore}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#475569",
                  }}
                >
                  / 20
                </Typography>

                <Chip
                  label={cuePassed ? "Pass" : "Review"}
                  size="small"
                  sx={{
                    ml: "auto",
                    height: 24,
                    fontSize: 11,
                    fontWeight: 900,
                    bgcolor: cuePassed ? "#dcfce7" : "#ffedd5",
                    color: cuePassed ? "#15803d" : "#c2410c",
                    border: `1px solid ${cuePassed ? "#bbf7d0" : "#fed7aa"}`,
                  }}
                />
              </Stack>

              <Divider />

              <Box>
                <Typography
                  fontSize={13}
                  sx={{
                    color: cuePassed ? "#047857" : "#c2410c",
                    fontWeight: 750,
                    lineHeight: 1.55,
                  }}
                >
                  {cuePassed
                    ? "CUE score passes the acceptable threshold."
                    : "CUE score exceeds the acceptable threshold."}
                </Typography>

                <Typography fontSize={12} color="text.secondary" sx={{ mt: 0.5 }}>
                  Passing threshold: 12 and below.
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Box
              sx={{
                height: "100%",
                minHeight: 205,
                p: 3,
                borderRadius: 4,
                bgcolor: "#f8fbff",
                border: "1px solid #dbeafe",
                display: "grid",
                gridTemplateRows: "22px 52px 1px auto",
                rowGap: 1.4,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#1d4ed8",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  lineHeight: "22px",
                }}
              >
                Model Approved Limit
              </Typography>

              <Typography
                sx={{
                  fontSize: 34,
                  fontWeight: 950,
                  color: "#0f172a",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {formatCurrency(rm.approved_limit)}
              </Typography>

              <Divider />

              <Box>
                <Typography fontSize={13} color="text.secondary" sx={{ mb: 0.3 }}>
                  Requested
                </Typography>

                <Typography fontSize={17} fontWeight={850} color="#0f172a">
                  {formatCurrency(rm.requested_amount)}
                </Typography>
              </Box>
            </Box>
          </Grid>
          </Grid>
        </Panel>
      )}





    <Panel title="Bank Statement Review">
      <Typography
        color="text.secondary"
        sx={{ fontSize: 13, lineHeight: 1.6, mb: 2.5 }}
      >
        OCR-extracted statement data and automated checks for suspicious transaction
        activity and document integrity.
      </Typography>

      {/* Statement summary */}
      <Grid container spacing={1.5}>
        {[
          {
            label: "Detected Bank",
            value: bank.bank || "—",
          },
          {
            label: "Total Transactions",
            value: bank.total_transaction_count ?? "—",
            subtext:
              bank.total_transaction_count != null
                ? `${bank.credit_transaction_count ?? 0} credit · ${
                    bank.debit_transaction_count ?? 0
                  } debit`
                : "",
          },
          {
            label: "Total Credits",
            value:
              bank.total_credits != null
                ? formatCurrency(bank.total_credits)
                : "—",
          },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                p: 2.2,
                height: "100%",
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e5e7eb",
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 850,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                {item.label}
              </Typography>

              <Typography
                sx={{
                  mt: 0.65,
                  fontSize: 26,
                  fontWeight: 950,
                  color: "#0f172a",
                  lineHeight: 1.1,
                }}
              >
                {item.value}
              </Typography>

              {item.subtext && (
                <Typography
                  sx={{
                    mt: 0.7,
                    fontSize: 12.5,
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  {item.subtext}
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Credit-kiting assessment */}
      <Box sx={{ mt: 3.2 }}>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 900,
            color: "#0f172a",
            mb: 2,
          }}
        >
          Credit-kiting Risk Assessment
        </Typography>

        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, sm: 3 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 900,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              Risk Score
            </Typography>

            <Typography
              sx={{
                mt: 0.55,
                fontSize: 32,
                fontWeight: 950,
                color: kiting.flagged ? "#b91c1c" : "#15803d",
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              {kiting.score ?? 0}/100
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 900,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              Suspicious Credits Flagged
            </Typography>

            <Typography
              sx={{
                mt: 0.55,
                fontSize: 26,
                fontWeight: 950,
                color: kiting.flagged ? "#b91c1c" : "#0f172a",
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              {bank.suspicious_credits?.length ?? 0}
            </Typography>
          </Grid>

          <Grid
            size={{ xs: 12, sm: 6 }}
            sx={{
              display: "flex",
              justifyContent: { xs: "flex-start", sm: "flex-end" },
              alignItems: "center",
            }}
          >
            <Button
              size="small"
              variant="outlined"
              onClick={() => onViewTampering?.(application)}
              sx={{
                px: 2.2,
                py: 0.85,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 850,
                color: "#b91c1c",
                borderColor: "#fca5a5",
                bgcolor: "#ffffff",
                boxShadow: "none",
                whiteSpace: "nowrap",
                "&:hover": {
                  bgcolor: "#fef2f2",
                  borderColor: "#ef4444",
                  boxShadow: "none",
                },
              }}
            >
              View details →
            </Button>
          </Grid>
        </Grid>

        {/* Impact on assessed turnover */}
        <Box
          sx={{
            mt: 2,
            p: 2.4,
            borderRadius: 3.5,
            bgcolor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderLeft: "4px solid #dc2626",
            boxShadow: "0 8px 18px rgba(15,23,42,.04)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "flex-start" }}
            spacing={2}
            sx={{ mb: 2.3 }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 17,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                Impact on Assessed Turnover
              </Typography>

              <Typography
                fontSize={13}
                color="text.secondary"
                sx={{ mt: 0.65, lineHeight: 1.6 }}
              >
                Flagged suspicious credits are excluded from turnover used for credit assessment.
              </Typography>
            </Box>

           
          </Stack>

          <Grid container spacing={2.5}>
            {[
              {
                label: "Total Statement Credits",
                value: formatCurrency(totalStatementCredits),
                color: "#0f172a",
              },
              {
                label: "Less: Flagged Volume",
                value: `−${formatCurrency(flaggedVolume)}`,
                color: "#b91c1c",
              },
              {
                label: "True Adjusted Turnover",
                value: formatCurrency(trueAdjustedTurnover),
                color: "#1d4ed8",
              },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
                <Box
                  sx={{
                    p: 1.6,
                    borderRadius: 2.5,
                    bgcolor: "#f8fafc",
                    border: "1px solid #eef2f7",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 850,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                    }}
                  >
                    {item.label}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.45,
                      fontSize: 21,
                      fontWeight: 950,
                      color: item.color,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Panel>

      {/* ACRA shareholders & personal guarantee */}
      <Panel title="ACRA Shareholders & Personal Guarantee">
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            mb: 2,
            bgcolor: pgCoverageOk ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${pgCoverageOk ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
            <Typography fontWeight={800} sx={{ mr: 0.5 }}>
              Personal Guarantee Shareholding Coverage:
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography fontWeight={900} sx={{ color: pgCoverageOk ? "#15803d" : "#b91c1c" }}>
                {pgCoverage}%
              </Typography>
              <PassChip passed={pgCoverageOk} passLabel="Meets 50%" failLabel="Below 50%" />
            </Stack>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, pgCoverage)}
            sx={{
              mt: 1,
              height: 8,
              borderRadius: 99,
              bgcolor: "#e5e7eb",
              "& .MuiLinearProgress-bar": { bgcolor: pgCoverageOk ? "#16a34a" : "#dc2626" },
            }}
          />
        </Box>

        <Typography fontWeight={800} sx={{ mb: 1 }}>
          Selected personal guarantors
        </Typography>
        {pgs.length === 0 ? (
          <Typography color="text.secondary">No personal guarantors were selected.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Shareholding</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Verification</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Age</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">IRAS income</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>CBS consent</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Documents</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pgs.map((p, idx) => {
                const methodLabel =
                  p.method === "MANUAL"
                    ? "Manual upload"
                    : p.method === "SINGPASS_REMOTE"
                      ? "Singpass (remote)"
                      : p.method === "SINGPASS"
                        ? "Singpass"
                        : null;
                return (
                  <TableRow key={p.name || idx}>
                    <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {p.shareholding != null ? `${p.shareholding}%` : "—"}
                    </TableCell>
                    <TableCell>
                      {p.verified ? (
                        <Stack spacing={0.3}>
                          <PassChip passed passLabel="Verified" failLabel="—" />
                          {methodLabel && (
                            <Typography fontSize={11} color="text.secondary">
                              {methodLabel}
                            </Typography>
                          )}
                        </Stack>
                      ) : (
                        <Chip
                          size="small"
                          label="Pending"
                          sx={{ bgcolor: "#fef3c7", color: "#b45309", fontWeight: 800 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ pr: 2 }}>
                      {p.age != null ? (
                        <Stack
                          direction="column"
                          spacing={0.5}
                          alignItems="flex-end"
                          justifyContent="center"
                          sx={{ minWidth: 70 }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              fontWeight: 700,
                              lineHeight: 1.2,
                            }}
                          >
                            {p.age}
                          </Typography>

                          <PassChip
                            passed={p.age < 70}
                            passLabel="<70"
                            failLabel="≥70"
                          />
                        </Stack>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {p.irasIncome != null ? formatCurrency(p.irasIncome) : "—"}
                    </TableCell>
                    <TableCell>
                      <PassChip passed={!!p.cbsConsent} passLabel="Granted" failLabel="Pending" />
                    </TableCell>
                    <TableCell>
                      {p.ic_path || p.iras_path ? (
                        <Stack direction="row" spacing={0.5}>
                          {p.ic_path && (
                            <Button
                              size="small"
                              variant="text"
                              href={getGuarantorFileUrl(application.application_id, idx, "ic")}
                              target="_blank"
                              sx={{ minWidth: 0, textTransform: "none", fontWeight: 700 }}
                            >
                              IC
                            </Button>
                          )}
                          {p.iras_path && (
                            <Button
                              size="small"
                              variant="text"
                              href={getGuarantorFileUrl(application.application_id, idx, "iras")}
                              target="_blank"
                              sx={{ minWidth: 0, textTransform: "none", fontWeight: 700 }}
                            >
                              IRAS
                            </Button>
                          )}
                        </Stack>
                      ) : (
                        <Typography fontSize={12} color="text.secondary">
                          {p.method === "SINGPASS" || p.method === "SINGPASS_REMOTE"
                            ? "Via Singpass"
                            : "—"}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Verification & consent rollup */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          {agesKnown && (
            <Typography fontSize={13} color={pgAgesOk ? "#15803d" : "#b91c1c"} fontWeight={700}>
              {pgAgesOk
                ? "All verified guarantors are under 70."
                : "One or more guarantors are 70 or older — review required."}
            </Typography>
          )}
          {pgs.length > 0 && (
            <Typography fontSize={13} color={allPgVerified ? "#15803d" : "#b45309"} fontWeight={700}>
              {allPgVerified
                ? "All guarantors identity-verified."
                : "Some guarantors pending identity verification."}
            </Typography>
          )}
          {pgs.length > 0 && (
            <Typography fontSize={13} color={allPgCbsConsent ? "#15803d" : "#b45309"} fontWeight={700}>
              {allPgCbsConsent
                ? "CBS consent granted by all guarantors."
                : "CBS consent outstanding for some guarantors."}
            </Typography>
          )}
        </Stack>

        {acra.shareholders && acra.shareholders.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography fontWeight={800} sx={{ mb: 1 }}>
              All shareholders (ACRA / MyInfo Business)
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {acra.shareholders.map((s) => (
                <Chip
                  key={s.name}
                  variant="outlined"
                  label={`${s.name} · ${s.shareholding != null ? s.shareholding + "%" : "—"}`}
                  sx={{ fontWeight: 700 }}
                />
              ))}
            </Stack>
          </>
        )}
      </Panel>

      {/* Existing debt detection */}
      {debt.recurring_deductions && debt.recurring_deductions.length > 0 && (
        <Panel title="Existing Debt Detection — 6-Month Bank Statement Analysis">
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <SummaryRow label="Declared by applicant" value={debt.declared || "NIL"} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <SummaryRow label="Detected monthly servicing" value={formatCurrency(debt.detected_monthly || 0)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <SummaryRow label="Annualised" value={formatCurrency(debt.annualised || 0)} />
            </Grid>
          </Grid>
          <Box sx={{ mb: 2 }}>
            <PassChip
              passed={!debt.undeclared}
              passLabel="Matches declared debt"
              failLabel="Undeclared debt detected"
            />
            {debt.undeclared && debt.undeclared_note && (
              <Typography color="error" fontSize={13} fontWeight={700} sx={{ mt: 1 }}>
                {debt.undeclared_note}
              </Typography>
            )}
          </Box>
          <Typography fontWeight={800} sx={{ mb: 1 }}>
            Recurring deductions detected across {debt.consistent_months || 6} months
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Lender</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Months seen</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Monthly amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupDeductions(debt.recurring_deductions).map((g, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontWeight: 700 }}>{g.lender}</TableCell>
                  <TableCell>{g.description}</TableCell>
                  <TableCell>
                    <Chip size="small" label={`${g.months} / 6`} sx={{ fontWeight: 800, bgcolor: g.months >= 6 ? "#dbeafe" : "#f1f5f9", color: "#1d4ed8" }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(g.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography fontSize={12} color="text.secondary" sx={{ mt: 1.5 }}>
            A fixed amount recurring on/around the same day every month is treated as an active debt facility.
          </Typography>
        </Panel>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <LightKycPanel application={application} lightKyc={lightKyc} aml={aml} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Panel title="">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={2}
              sx={{ mb: 2}}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                >
                  Litigation Search
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 0.45,
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  Screening for outstanding legal cases, charges, and adverse records.
                </Typography>
              </Box>

              <Chip
                label={litigation.passed ? "Clear" : "Review Required"}
                size="small"
                sx={{
                  fontWeight: 900,
                  bgcolor: litigation.passed ? "#ecfdf5" : "#ffedd5",
                  color: litigation.passed ? "#047857" : "#c2410c",
                  border: `1px solid ${
                    litigation.passed ? "#bbf7d0" : "#fed7aa"
                  }`,
                }}
              />
            </Stack>

            {litigation.charges && litigation.charges.length > 0 ? (
              <Stack spacing={1.2}>
                {litigation.charges.map((charge, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      bgcolor: "#fffaf5",
                      border: "1.5px solid #fdba74",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "flex-start" }}
                      spacing={1.5}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: "#9a3412",
                          }}
                        >
                          {charge.chargee_bank || "Outstanding Charge"}
                        </Typography>

                        <Typography
                          fontSize={13}
                          color="text.secondary"
                          sx={{ mt: 0.45, lineHeight: 1.55 }}
                        >
                          Legal charge recorded against the applicant.
                        </Typography>

                        <Stack
                          direction="row"
                          spacing={3}
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 1.2 }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: 10.5,
                                fontWeight: 850,
                                color: "#64748b",
                                textTransform: "uppercase",
                                letterSpacing: ".05em",
                              }}
                            >
                              Charge Amount
                            </Typography>

                            <Typography
                              sx={{
                                mt: 0.3,
                                fontSize: 16,
                                fontWeight: 900,
                                color: "#0f172a",
                              }}
                            >
                              {formatCurrency(charge.charge_amount)}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              sx={{
                                fontSize: 10.5,
                                fontWeight: 850,
                                color: "#64748b",
                                textTransform: "uppercase",
                                letterSpacing: ".05em",
                              }}
                            >
                              Status
                            </Typography>

                            <Typography
                              sx={{
                                mt: 0.3,
                                fontSize: 16,
                                fontWeight: 900,
                                color: "#c2410c",
                              }}
                            >
                              {charge.status || "Open"}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "#ffffff",
                  border: "1px solid #e5e7eb",
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                      No outstanding litigation
                    </Typography>

                    <Typography
                      fontSize={13}
                      color="text.secondary"
                      sx={{ mt: 0.35 }}
                    >
                      No adverse legal cases or charges were identified.
                    </Typography>
                  </Box>

                  <Chip
                    label="Clear"
                    size="small"
                    sx={{
                      fontWeight: 900,
                      bgcolor: "#ecfdf5",
                      color: "#047857",
                      border: "1px solid #bbf7d0",
                    }}
                  />
                </Stack>
              </Box>
            )}

            {!litigation.passed && (
              <Box
                sx={{
                  mt: 1.5,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  size="small"
                  variant="text"
                  onClick={() => onViewLitigation?.(application)}
                  sx={{
                    px: 0,
                    minWidth: 0,
                    textTransform: "none",
                    fontWeight: 850,
                    color: "#c2410c",
                    "&:hover": {
                      bgcolor: "transparent",
                      textDecoration: "underline",
                    },
                  }}
                >
                  View details →
                </Button>
              </Box>
            )}
          </Panel>
          <FinancialIndicatorsPanel
            application={application}
            fin={fin}
            formatCurrency={formatCurrency}
          />
        </Grid>
      </Grid>

      {uw.industry_analysis && (
        <Panel title="AI Industry Analysis">
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={800}>{uw.industry_analysis.sector}</Typography>
              <Chip
                label={`${uw.industry_analysis.risk_level} risk`}
                size="small"
                sx={{
                  fontWeight: 800,
                  bgcolor:
                    uw.industry_analysis.risk_level === "Low"
                      ? "#dcfce7"
                      : uw.industry_analysis.risk_level === "Moderate"
                      ? "#fef3c7"
                      : "#fee2e2",
                  color:
                    uw.industry_analysis.risk_level === "Low"
                      ? "#15803d"
                      : uw.industry_analysis.risk_level === "Moderate"
                      ? "#b45309"
                      : "#b91c1c",
                }}
              />
            </Stack>

            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {uw.industry_analysis.summary}
            </Typography>

            <Box>
              <Typography fontWeight={700} sx={{ mb: 1, fontSize: 14 }}>
                Key risks identified
              </Typography>
              <Stack spacing={1}>
                {uw.industry_analysis.key_risks.map((risk, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "#fef2f2",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <Typography fontSize={13} fontWeight={600} color="#b91c1c">
                      ⚠ {risk}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f0f7ff", border: "1px solid #bfdbfe" }}>
              <Typography fontSize={13} fontWeight={700} color="#1d4ed8">
                Outlook: {uw.industry_analysis.outlook}
              </Typography>
            </Box>


          </Stack>
        </Panel>
      )}

    </>
  );
}
