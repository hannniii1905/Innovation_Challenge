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

  const QuestionCard = ({ title, field }) => (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: "#f8fafc",
        border: "1px solid #e5e7eb",
        height: "100%",
      }}
    >
      <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>
        {title}
      </Typography>

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
              "linear-gradient(90deg, rgba(238,242,255,0.9), rgba(255,255,255,0.9))",
          }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
            Additional Declarations
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.8, fontSize: 14 }}>
            Please provide the following declarations for the initial credit assessment.
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <QuestionCard
                title="Has your company recorded a positive EBITDA in the latest financial year?"
                field="positiveEBITDA"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <QuestionCard
                title="Does your company have a positive Tangible Net Worth?"
                field="positiveTNW"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <QuestionCard
                title="Does your company currently have existing loans or banking facilities?"
                field="existingLoans"
              />
            </Grid>

            {declarations.existingLoans === "yes" && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Existing loan / facility details"
                  placeholder="Example: lender name, facility type, outstanding amount, monthly repayment"
                  value={declarations.existingLoanDetails || ""}
                  onChange={(e) => update("existingLoanDetails", e.target.value)}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <QuestionCard
                title="Has the company defaulted on any loan repayments in the past 12 months?"
                field="recentDefault"
              />
            </Grid>

          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}