import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Stack,
} from "@mui/material";

export default function CompanyInformation({ application }) {
  const p = application.profile;

  const Field = ({ label, value }) => (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: "#f8fafc",
        border: "1px solid #e5e7eb",
        height: "100%",
      }}
    >
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: ".08em",
          mb: 0.8,
        }}
      >
        {label}
      </Typography>

      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {value || "-"}
      </Typography>
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
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                Company Information
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 0.8, fontSize: 14 }}>
                Retrieved from Singpass MyInfo Business.
              </Typography>
            </Box>

            <Chip
              label="Verified via Singpass"
              sx={{
                bgcolor: "#ecfdf5",
                color: "#047857",
                fontWeight: 700,
              }}
            />
          </Stack>
        </Box>

        <Box sx={{ p: 4 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <Field label="Company Name" value={p.companyName} />
            </Grid>

            <Grid item xs={12} md={3}>
              <Field label="UEN" value={p.uen} />
            </Grid>

            <Grid item xs={12} md={3}>
              <Field label="Incorporation Date" value={p.incorporationDate} />
            </Grid>

            <Grid item xs={12}>
              <Field label="Industry" value={p.industry} />
            </Grid>

            <Grid item xs={12}>
              <Field label="Directors" value={p.directors?.join(", ")} />
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}