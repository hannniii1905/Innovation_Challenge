import { Box, Paper, Typography, Button } from "@mui/material";

const profiles = [
  {
    id: 1,
    companyName: "NEXUS INNOVATION PTE. LTD.",
    uen: "202188341M",
    industry: "Development of software and applications",
    directors: ["Alex Tan Wei Liang", "Sarah Lim Xiu Qi"],
    incorporationDate: "2021-03-15",
  },
  {
    id: 2,
    companyName: "VORTEX RETAIL SINGAPORE PTE. LTD.",
    uen: "201844192K",
    industry: "Supermarkets and Department Stores",
    directors: ["Clara Low", "Alicia Teo Min"],
    incorporationDate: "2018-07-22",
  },
  {
    id: 3,
    companyName: "ORION LOGISTICS PTE. LTD.",
    uen: "202012345R",
    industry: "Freight Forwarding Services",
    directors: ["Michael Ong", "Daniel Goh"],
    incorporationDate: "2020-10-09",
  },
];

export default function DemoProfileSelector({ onSelect }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f6f8fc",
        fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(100deg,#4f46e5,#8b5cf6,#d946ef)",
          color: "white",
          px: 4,
          py: 5,
        }}
      >
        <Box
          sx={{
            maxWidth: 1100,
            mx: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 36,
                fontWeight: 850,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
              }}
            >
              UOB Credit AI
            </Typography>

            <Typography sx={{ mt: 1, opacity: 0.92, fontSize: 16 }}>
              Select a demo company profile to begin the application journey.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            sx={{
              borderRadius: 3,
              fontWeight: 800,
              bgcolor: "white",
              color: "#4f46e5",
              borderColor: "white",
              px: 3,
              py: 1.2,
              "&:hover": {
                bgcolor: "#f8fafc",
                borderColor: "white",
              },
            }}
            onClick={() => onSelect("__APPROVER__")}
          >
            Enter Credit Approver Portal
          </Button>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: "auto", p: 4 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 3,
          }}
        >
          {profiles.map((profile) => (
            <Paper
              key={profile.id}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: "1px solid #e5e7eb",
                boxShadow: "0 12px 28px rgba(15,23,42,.08)",
                transition: "0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 18px 36px rgba(79,70,229,.16)",
                },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  bgcolor: "#ede9fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  mb: 2,
                }}
              >
                🏢
              </Box>

              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 800,
                  lineHeight: 1.25,
                  minHeight: 48,
                }}
              >
                {profile.companyName}
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                UEN: {profile.uen}
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1, minHeight: 48 }}>
                {profile.industry}
              </Typography>

              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  height: 46,
                  borderRadius: 3,
                  fontWeight: 800,
                  background: "linear-gradient(90deg,#4f46e5,#7c3aed)",
                }}
                onClick={() => onSelect(profile)}
              >
                Select Profile
              </Button>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}