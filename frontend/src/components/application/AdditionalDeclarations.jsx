import {
  Card,
  CardContent,
  Typography,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  TextField,
  Grid,
  Box,
  Stack,
  Divider,
  MenuItem,
} from "@mui/material";

export default function AdditionalDeclarations({ application, setApplication }) {
  const declarations = application.declarations || {};

  const update = (field, value) => {
    setApplication((prev) => ({
      ...prev,
      declarations: {
        ...prev.declarations,
        [field]: value,
      },
    }));
  };

  const SectionHeader = ({ label, title, description }) => (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 900,
          color: "#005eb8",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          mb: 0.7,
        }}
      >
        {label}
      </Typography>

      <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
        {title}
      </Typography>

      {description && (
        <Typography color="text.secondary" sx={{ mt: 0.7, fontSize: 14 }}>
          {description}
        </Typography>
      )}
    </Box>
  );

  const QuestionCard = ({ title, field, children }) => (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: "#f8fafc",
        border: "1px solid #e5e7eb",
        width: "100%",
      }}
    >
      <Typography sx={{ fontWeight: 700, color: "#0b101d", mb: 2 }}>
        {title}
      </Typography>

      {children && (
        <Box sx={{ mb: 2, color: "text.secondary", fontSize: 14 }}>
          {children}
        </Box>
      )}

      <FormControl>
        <RadioGroup
          value={declarations[field] || ""}
          onChange={(e) => update(field, e.target.value)}
        >
          <Stack direction="row" spacing={3}>
            <FormControlLabel value="yes" control={<Radio />} label="Yes" />
            <FormControlLabel value="no" control={<Radio />} label="No" />
          </Stack>
        </RadioGroup>
      </FormControl>
    </Box>
  );

  const DetailsField = ({ field, label, placeholder }) => (
    <TextField
      fullWidth
      multiline
      minRows={3}
      label={label}
      placeholder={placeholder}
      value={declarations[field] || ""}
      onChange={(e) => update(field, e.target.value)}
      sx={{ mt: 2 }}
    />
  );

  const ExistingLoanFields = () => (
  <Box
    sx={{
      mt: 2,
      p: 2.5,
      borderRadius: 3,
      bgcolor: "#ffffff",
      border: "1px solid #e5e7eb",
    }}
  >
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          select
          fullWidth
          label="Bank"
          value={declarations.existingLoanBank || ""}
          onChange={(e) => update("existingLoanBank", e.target.value)}
        >
          <MenuItem value="UOB">UOB</MenuItem>
          <MenuItem value="OCBC">OCBC</MenuItem>
          <MenuItem value="DBS">DBS</MenuItem>
          <MenuItem value="MayBank">MayBank</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          select
          fullWidth
          label="Product Type"
          value={declarations.existingLoanProductType || ""}
          onChange={(e) => update("existingLoanProductType", e.target.value)}
        >
          <MenuItem value="Mortgage">Mortgage</MenuItem>
          <MenuItem value="Property">Property</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          type="number"
          label="Amount"
          placeholder="Example: 500000"
          value={declarations.existingLoanAmount || ""}
          onChange={(e) => update("existingLoanAmount", e.target.value)}
          InputProps={{
            startAdornment: <Box sx={{ mr: 1, color: "text.secondary" }}>$</Box>,
          }}
        />
      </Grid>
    </Grid>
  </Box>
);

const SanctionsCriteriaList = () => {
  const items = [
    "Sanctioned Parties",
    "National / Resident",
    "Registered / Operated / Located",
    "IDD Prefix",
  ];

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 2,
        borderRadius: 2,
        bgcolor: "#ffffff",
        border: "1px solid #cbd5e1",
        borderLeft: "4px solid #005eb8",
      }}
    >
      <Typography
        sx={{
          fontSize: 14.5,
          fontWeight: 900,
          color: "#0f172a",
          mb: 1,
          lineHeight: 1.4,
        }}
      >
        Applicable criteria:
      </Typography>

      <Box
        component="ul"
        sx={{
          m: 0,
          pl: 2.5,
          color: "#334155",
          fontSize: 13.5,
          fontWeight: 600,
          lineHeight: 1.75,
        }}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Box>
    </Box>
  );
};

const FormalInfoBox = ({ title, items }) => (
  <Box
    sx={{
      mt: 1.5,
      p: 2,
      borderRadius: 2,
      bgcolor: "#ffffff",
      border: "1px solid #cbd5e1",
      borderLeft: "4px solid #005eb8",
    }}
  >
    <Typography
      sx={{
        fontSize: 14.5,
        fontWeight: 900,
        color: "#0f172a",
        mb: 1,
        lineHeight: 1.4,
      }}
    >
      {title}
    </Typography>

    <Box
      component="ul"
      sx={{
        m: 0,
        pl: 2.5,
        color: "#334155",
        fontSize: 13.5,
        fontWeight: 600,
        lineHeight: 1.75,
      }}
    >
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </Box>
  </Box>
);

const RecentDefaultFields = () => (
  <Box
    sx={{
      mt: 2,
      p: 2.5,
      borderRadius: 3,
      bgcolor: "#ffffff",
      border: "1px solid #e5e7eb",
    }}
  >
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          select
          fullWidth
          label="Bank / Lender"
          value={declarations.defaultBank || ""}
          onChange={(e) => update("defaultBank", e.target.value)}
        >
          <MenuItem value="UOB">UOB</MenuItem>
          <MenuItem value="OCBC">OCBC</MenuItem>
          <MenuItem value="DBS">DBS</MenuItem>
          <MenuItem value="MayBank">MayBank</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          select
          fullWidth
          label="Product Type"
          value={declarations.defaultProductType || ""}
          onChange={(e) => update("defaultProductType", e.target.value)}
        >
          <MenuItem value="Mortgage">Mortgage</MenuItem>
          <MenuItem value="Property">Property</MenuItem>
          <MenuItem value="Term Loan">Term Loan</MenuItem>
          <MenuItem value="Overdraft">Overdraft</MenuItem>
          <MenuItem value="Trade Facility">Trade Facility</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          select
          fullWidth
          label="Default Period"
          value={declarations.defaultPeriod || ""}
          onChange={(e) => update("defaultPeriod", e.target.value)}
        >
          <MenuItem value="1-30 days">1–30 days</MenuItem>
          <MenuItem value="31-60 days">31–60 days</MenuItem>
          <MenuItem value="61-90 days">61–90 days</MenuItem>
          <MenuItem value="More than 90 days">More than 90 days</MenuItem>
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          type="number"
          label="Overdue Amount"
          placeholder="Example: 25000"
          value={declarations.defaultOverdueAmount || ""}
          onChange={(e) => update("defaultOverdueAmount", e.target.value)}
          InputProps={{
            startAdornment: <Box sx={{ mr: 1, color: "text.secondary" }}>$</Box>,
          }}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          select
          fullWidth
          label="Current Status"
          value={declarations.defaultCurrentStatus || ""}
          onChange={(e) => update("defaultCurrentStatus", e.target.value)}
        >
          <MenuItem value="Fully settled">Fully settled</MenuItem>
          <MenuItem value="Restructured">Restructured</MenuItem>
          <MenuItem value="Still overdue">Still overdue</MenuItem>
          <MenuItem value="Under negotiation">Under negotiation</MenuItem>
        </TextField>
      </Grid>
    </Grid>
  </Box>
);

const SmallInfoList = ({ title, items }) => (
  <Box sx={{ mt: 1.5 }}>
    <Typography
      sx={{
        fontSize: 13,
        fontWeight: 800,
        color: "#334155",
        mb: 0.6,
      }}
    >
      {title}
    </Typography>

    <Box
      component="ul"
      sx={{
        pl: 2.5,
        my: 0,
        color: "#475569",
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </Box>
  </Box>
);


  return (
    <Card
      elevation={0}
      sx={{
        mb: 4,
        borderRadius: 5,
        border: "1px solid #e5e7eb",
        boxShadow: "0 18px 40px rgba(15,23,42,.07)",
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
          <Typography sx={{ fontSize: 25, fontWeight: 800, color: "#0f172a" }}>
            Additional Declarations
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.8, fontSize: 14 }}>
            Please provide the following declarations for the initial credit assessment.
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          {/* SECTION A */}
          <SectionHeader
            label="Section A"
            title="Financial Performance"
            description="These declarations help us assess the company’s financial strength and repayment profile."
          />

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <QuestionCard
                title="Has your company recorded a positive EBITDA in the latest financial year?"
                field="positiveEBITDA"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <QuestionCard
                title="Does your company have a positive Net Worth (Paid Up Capital + Retained Earnings) in the latest financial year?"
                field="positiveTNW"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <QuestionCard
                title="Does your company currently have existing loans or banking facilities?"
                field="existingLoans"
              />

              {declarations.existingLoans === "yes" && <ExistingLoanFields />}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <QuestionCard
                title="Has the company defaulted on any loan repayments in the past 12 months?"
                field="recentDefault"
              />

              {declarations.recentDefault === "yes" && <RecentDefaultFields />}
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* SECTION B */}
          <SectionHeader
            label="Section B"
            title="Sanctions Exposure"
            description="These declarations help us identify possible sanctions-related exposure through direct or indirect dealings.  Sanctioned Countries/Regions: Iran, North Korea, Syria, Cuba, and Crimea, Kherson, Zaporizhzhia, Luhansk and Donetsk Regions in Ukraine."
          />

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <QuestionCard
                title="Do you transact with persons/entities, both currently or in the future, who are/have any of the following connections to the Sanctioned Countries or Regions?"
                field="directSanctionsExposure"
              >
                <SanctionsCriteriaList />
              </QuestionCard>

              {declarations.directSanctionsExposure === "yes" && (
                <DetailsField
                  field="directSanctionsExposureDetails"
                  placeholder="Please provide the persons'/entities' names, sanctioned country involved, transactions and your Bank's information."
                />
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <QuestionCard
                title="Do you transact with persons/entities, both currently or in the future, indirectly via subsidiaries, representative offices or intermediaries who are/have any of the following connections to the Sanctioned Countries or Regions?"
                field="indirectSanctionsExposure"
              >
                <SanctionsCriteriaList />
              </QuestionCard>

              {declarations.indirectSanctionsExposure === "yes" && (
                <DetailsField
                  field="indirectSanctionsExposureDetails"
                  placeholder="Please provide the persons'/entities' names, sanctioned country involved, transactions and your Bank's information."
                />
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <QuestionCard
                title="Do you have subsidiaries, representative offices or any related companies which are/have any of the following connections to the Sanctioned Countries or Regions?"
                field="relatedCompanySanctionsExposure"
              >
                <SanctionsCriteriaList />
              </QuestionCard>

              {declarations.relatedCompanySanctionsExposure === "yes" && (
                <DetailsField
                  field="relatedCompanySanctionsExposureDetails"
                  placeholder="Please provide the persons'/entities' names, address, type of relationship, and nature of dealings involved."
                />
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <QuestionCard
                title="Do you have any dealings involving the specified sectors/items seen in the table below?"
                field="specifiedSectorDealings"
              >
                <FormalInfoBox
                  title="Specified sectors:"
                  items={[
                    "- Technology",
                    "- Aerospace",
                    "- Defense and related materiel",
                    "- Metals and mining",
                  ]}
                />

                <FormalInfoBox
                  title="Specified items:"
                  items={[
                    "- Certain machine tools and manufacturing equipment, e.g. numerically controlled CNC machine tools, additive manufacturing machine tools",
                    "- Certain navigation instruments, e.g. inertial navigation systems, gyroscopes",
                  ]}
                />
              </QuestionCard>

              {declarations.specifiedSectorDealings === "yes" && (
                <DetailsField
                  field="specifiedSectorDealingsDetails"
                  placeholder="Please provide the persons'/entities' names, sanctioned country involved, transactions and your Bank's information."
                />
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <QuestionCard
                title="Do you have any dealings with Myanmar Military/Government or entities owned by Myanmar Military/Government that are Sanctioned directly or indirectly?"
                field="otherSanctionsDealings"
              />

              {declarations.otherSanctionsDealings === "yes" && (
                <DetailsField
                  field="otherSanctionsDealingsDetails"
                  placeholder="Please provide the persons'/entities' names, sanctioned country involved, transactions and your Bank's information."
                />
              )}
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}