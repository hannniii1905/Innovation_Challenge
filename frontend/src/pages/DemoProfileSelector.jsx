import { Box, Paper, Typography, Button } from "@mui/material";

const profiles = [
  {
    id: 1,
    caseLabel: "Case 1",
    outcome: "Approve",
    outcomeDesc: "Clean profile — auto-approved by the engine.",
    accent: "#16a34a",
    accentBg: "#dcfce7",
    companyName: "NEXUS INNOVATION PTE. LTD.",
    uen: "202188341M",  
    industry: "Development of software and applications",
    directors: ["Alex Tan Wei Liang", "Sarah Lim Xiu Qi"],
    incorporationDate: "2021-03-15",
    // --- MyInfo Business ---
    businessInfo: {
      entityType: "Local Company (Private Limited)",
      entityStatus: "Live Company",
      primarySsic: "62011 — Development of software & applications",
      registeredAddress: "71 Ayer Rajah Crescent, #03-12, Singapore 139951",
      issuedCapital: "SGD 100,000",
    },
    // --- Appointments (MyInfo Business) + personal particulars (MyInfo Person) ---
    keymen: [
      {
        name: "Alex Tan Wei Liang",
        role: "Director / Shareholder",
        shareholding: 35,
        nric: "S8•••••5A",
        dob: "1985-04-12",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
        mobile: "+65 9•••1234",
        email: "a•••@nexus.com.sg",
        registeredAddress: "6 Bishan Street 13, #10-32, Singapore 579798",
      },
      {
        name: "Sarah Lim Xiu Qi",
        role: "Director / Shareholder",
        shareholding: 25,
        nric: "S9•••••2G",
        dob: "1990-09-30",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
        registeredAddress: "Ayer Rajah Crescent, #03-12, Singapore 139951",

      },
      {
        name: "Rajesh Kumar s/o Devan",
        role: "Director / Shareholder",
        shareholding: 15,
        nric: "S7•••••4F",
        dob: "1978-06-22",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
        registeredAddress: "Ayer Rajah Crescent, #03-12, Singapore 139951",
      },
      {
        name: "Grace Chua Hui Min",
        role: "Shareholder",
        shareholding: 10,
        nric: "S8•••••8H",
        dob: "1988-12-03",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
        registeredAddress: "Ayer Rajah Crescent, #03-12, Singapore 139951",

      },
      {
        name: "Benjamin Ng Jun Hao",
        role: "Shareholder",
        shareholding: 8,
        nric: "S9•••••1J",
        dob: "1995-02-17",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
        registeredAddress: "Ayer Rajah Crescent, #03-12, Singapore 139951",

      },
      {
        name: "Kelvin Wong Kok Wai",
        role: "Shareholder",
        shareholding: 7,
        nric: "S6•••••3K",
        dob: "1965-08-09",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
        registeredAddress: "Ayer Rajah Crescent, #03-12, Singapore 139951",

      },
    ],
  },
  {
    id: 2,
    caseLabel: "Case 2",
    outcome: "Review by Credit Analyst",
    outcomeDesc: "Mixed signals — referred for manual review.",
    accent: "#d97706",
    accentBg: "#fef3c7",
    companyName: "VORTEX RETAIL SINGAPORE PTE. LTD.",
    uen: "201844192K",
    industry: "Supermarkets and Department Stores",
    directors: ["Clara Low", "Alicia Teo Min"],
    incorporationDate: "2018-07-22",
    businessInfo: {
      entityType: "Local Company (Private Limited)",
      entityStatus: "Live Company",
      primarySsic: "47112 — Supermarkets & department stores",
      registeredAddress: "3 Tampines Central 1, #05-08, Singapore 529540",
      issuedCapital: "SGD 250,000",
    },
    keymen: [
      {
        name: "Clara Low Mei Ling",
        role: "Director / Shareholder",
        shareholding: 40,
        nric: "S6•••••9C",
        dob: "1969-02-15",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
        mobile: "+65 8•••5678",
        email: "c•••@vortex.com.sg",
        registeredAddress: "Ayer Rajah Crescent, #03-12, Singapore 139951",

      },
      {
        name: "Alicia Teo Min",
        role: "Director / Shareholder",
        shareholding: 20,
        nric: "S8•••••1B",
        dob: "1982-11-05",
        nationality: "Singapore PR",
        residentialStatus: "PR",
      },
      {
        name: "Marcus Sim Boon Keng",
        role: "Director / Shareholder",
        shareholding: 15,
        nric: "S7•••••6L",
        dob: "1975-05-30",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
      },
      {
        name: "Priya Nair",
        role: "Shareholder",
        shareholding: 12,
        nric: "S8•••••2M",
        dob: "1986-09-18",
        nationality: "Singapore PR",
        residentialStatus: "PR",
      },
      {
        name: "Hafiz Bin Rahman",
        role: "Shareholder",
        shareholding: 8,
        nric: "S9•••••7N",
        dob: "1991-03-25",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
      },
      {
        name: "Jonathan Lee Chee Wai",
        role: "Shareholder",
        shareholding: 5,
        nric: "S5•••••4P",
        dob: "1958-07-14",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
      },
    ],
  },
  {
    id: 3,
    caseLabel: "Case 3",
    outcome: "Reject",
    outcomeDesc: "Adverse records — declined by the engine.",
    accent: "#dc2626",
    accentBg: "#fee2e2",
    companyName: "ORION LOGISTICS PTE. LTD.",
    uen: "202012345R",
    industry: "Freight Forwarding Services",
    directors: ["Michael Ong", "Daniel Goh"],
    incorporationDate: "2020-10-09",
    businessInfo: {
      entityType: "Local Company (Private Limited)",
      entityStatus: "Live Company",
      primarySsic: "52291 — Freight forwarding services",
      registeredAddress: "8 Changi South Lane, #02-01, Singapore 486113",
      issuedCapital: "SGD 500,000",
    },
    keymen: [
      {
        name: "Michael Ong Teng Hui",
        role: "Director / Shareholder",
        shareholding: 55,
        nric: "S5•••••7D",
        dob: "1955-07-20",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
        mobile: "+65 9•••4321",
        email: "m•••@orion.com.sg",
      },
      {
        name: "Daniel Goh Wei Ming",
        role: "Director / Shareholder",
        shareholding: 20,
        nric: "S8•••••3E",
        dob: "1980-01-10",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
      },
      {
        name: "Steven Tan Kok Leong",
        role: "Director / Shareholder",
        shareholding: 10,
        nric: "S7•••••5Q",
        dob: "1972-04-05",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
      },
      {
        name: "Michelle Koh Swee Lian",
        role: "Shareholder",
        shareholding: 7,
        nric: "S8•••••9R",
        dob: "1984-10-28",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
      },
      {
        name: "Arjun Menon",
        role: "Shareholder",
        shareholding: 5,
        nric: "S9•••••0S",
        dob: "1990-06-11",
        nationality: "Singapore PR",
        residentialStatus: "PR",
      },
      {
        name: "Lim Wei Jie",
        role: "Shareholder",
        shareholding: 3,
        nric: "T0•••••2T",
        dob: "1996-01-19",
        nationality: "Singapore Citizen",
        residentialStatus: "Citizen",
      },
    ],
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
          background: "linear-gradient(120deg, #001A3F 0%, #002E5D 45%, #005EB8 100%)",
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
              Three demo scenarios, one per credit outcome. Pick a company to
              apply as and walk through its journey.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            sx={{
              borderRadius: 3,
              fontWeight: 800,
              bgcolor: "white",
              color: "#005EB8",
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
                  boxShadow: "0 18px 36px rgba(0,94,184,.16)",
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: "#e6f0fa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                  }}
                >
                  🏢
                </Box>

                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    bgcolor: profile.accentBg,
                    color: profile.accent,
                    fontWeight: 900,
                    fontSize: 12,
                    textAlign: "right",
                    lineHeight: 1.2,
                  }}
                >
                  {profile.caseLabel}
                  <Box sx={{ fontSize: 13 }}>{profile.outcome}</Box>
                </Box>
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

              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: profile.accentBg,
                  minHeight: 56,
                }}
              >
                <Typography
                  fontSize={12}
                  fontWeight={900}
                  sx={{ color: profile.accent }}
                >
                  Expected outcome: {profile.outcome}
                </Typography>
                <Typography fontSize={12} sx={{ color: profile.accent, mt: 0.3 }}>
                  {profile.outcomeDesc}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  height: 46,
                  borderRadius: 3,
                  fontWeight: 800,
                  background: "linear-gradient(90deg, #005EB8 0%, #0072CE 100%)",
                }}
                onClick={() => onSelect(profile)}
              >
                Apply as this company
              </Button>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}