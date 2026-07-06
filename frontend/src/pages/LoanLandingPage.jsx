import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  Divider,
} from "@mui/material";

export default function LoanLandingPage({ application, next, back }) {
  const profile = application.profile;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "white",
        fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
        color: "#0f172a",
      }}
    >
      {/* Top corporate bar */}

    <Box
      sx={{
        bgcolor: "#0056b8",
        color: "white",
        height: 60,
        display: "flex",
        alignItems: "center",
        px: 6,
     }}
    >
      <Box
        sx={{
        width: "100%",
        maxWidth: 1550,
        mx: "auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: "100%",
        }}
     >
        <Stack
          direction="row"
          spacing={4}
          alignItems="center"
          sx={{ height: "50%" }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 800 }}>
              YOU ARE IN
          </Typography>

          <Typography sx={{ fontSize: 15, fontWeight: 850 }}>
              GROUP WHOLESALE BANKING⌄
          </Typography>

          <Typography sx={{ fontSize: 15, fontWeight: 850 }}>
              SINGAPORE⌄
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={4}
          alignItems="center"
          sx={{ height: "50%" }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 850 }}>
              HELP & SUPPORT⌄
          </Typography>

          <Typography sx={{ fontSize: 15, fontWeight: 850 }}>
              CONTACT US
          </Typography>

          <Box
            sx={{
            height: "100%",
            px: 4,
            bgcolor: "#003b8f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 850,
            }}
        >
            LOGIN 🔒
          </Box>
        </Stack>
      </Box>
    </Box>

      {/* Main navigation */}
      <Box
        sx={{
          height: 120,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          px: 6,
          bgcolor: "white",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 1550,
            mx: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" spacing={4} alignItems="center">
          <UOBLogo />

            {[
              "Accounts & Transact",
              "Invest & Insure",
              "Finance",
              "Trade & FSCM",
              "Digital",
              "Advice",
              "Sustainability",
            ].map((item) => (
              <Typography
                key={item}
                sx={{
                  fontSize: 19,
                  color: "#005eb8",
                  fontWeight: 500,
                }}
              >
                {item}
              </Typography>
            ))}
          </Stack>

          <Stack direction="row" spacing={3.5} alignItems="center">
            <Typography sx={{ fontSize: 38, color: "#0056b8", lineHeight: 1 }}>
                ⌕
            </Typography>


          </Stack>
        </Box>
      </Box>

      {/* Page content */}
      <Box sx={{ maxWidth: 1180, mx: "auto", px: 4 }}>
        {/* Breadcrumb */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            mt: 4,
            mb: 7,
            color: "#005eb8",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          <Typography sx={{ fontWeight: 800 }}>Home</Typography>
          <Typography color="#111827">{">"}</Typography>
          <Typography sx={{ fontWeight: 800 }}>Finance</Typography>
          <Typography color="#111827">{">"}</Typography>
          <Typography sx={{ fontWeight: 800 }}>Operations Loans</Typography>
          <Typography color="#111827">{">"}</Typography>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>
            UOB BizMoney
          </Typography>
        </Stack>

        {/* Hero */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 0.92fr",
            gap: 7,
            alignItems: "center",
            mb: 7,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 66,
                lineHeight: 1.05,
                fontWeight: 400,
                letterSpacing: "-0.04em",
                color: "#005eb8",
              }}
            >
              UOB BizMoney
            </Typography>

            <Typography
              sx={{
                mt: 3,
                fontSize: 23,
                lineHeight: 1.45,
                maxWidth: 570,
                color: "#111827",
              }}
            >
              Secure a business loan within a day. No collaterals required.
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
              <Button
                variant="contained"
                onClick={next}
                sx={{
                  height: 58,
                  px: 4,
                  borderRadius: 1,
                  bgcolor: "#0088ff",
                  fontSize: 18,
                  fontWeight: 850,
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#0076dd" },
                }}
              >
                Apply online
              </Button>

              <Button
                variant="outlined"
                onClick={back}
                sx={{
                  height: 58,
                  px: 4,
                  borderRadius: 1,
                  borderWidth: 2,
                  borderColor: "#0088ff",
                  color: "#0088ff",
                  fontSize: 18,
                  fontWeight: 850,
                  textTransform: "none",
                  "&:hover": {
                    borderWidth: 2,
                    borderColor: "#0076dd",
                    bgcolor: "#f0f8ff",
                  },
                }}
              >
                Resume application
              </Button>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                mt: 4,
                p: 2.5,
                borderRadius: 2,
                border: "1px solid #e5e7eb",
                bgcolor: "#f8fafc",
                maxWidth: 560,
              }}
            >
              <Typography sx={{ fontSize: 13, color: "#64748b", mb: 0.5 }}>
                Selected demo applicant
              </Typography>
              <Typography sx={{ fontWeight: 800 }}>
                {profile.companyName}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                UEN: {profile.uen}
              </Typography>
            </Paper>
          </Box>

          {/* Hero image-style card */}
          <Box
            sx={{
              height: 300,
              borderRadius: 3,
              overflow: "hidden",
              position: "relative",
              background:
                "linear-gradient(135deg, rgba(0,94,184,.18), rgba(0,136,255,.08)), url('https://images.unsplash.com/photo-1560264280-88b68371db39?auto=format&fit=crop&w=900&q=80') center/cover",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(255,255,255,.2), rgba(255,255,255,0))",
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Tabs row */}
      <Box
        sx={{
          borderTop: "1px solid transparent",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 -1px 0 #f1f5f9 inset",
        }}
      >
        <Box
          sx={{
            maxWidth: 1180,
            mx: "auto",
            px: 4,
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            height: 86,
          }}
        >
          {["Benefits", "Rates & Fees", "Calculator", "Client Testimonials", "FAQs"].map(
            (tab, index) => (
              <Box
                key={tab}
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 22,
                    color: index === 0 ? "#0088ff" : "#111827",
                    fontWeight: index === 0 ? 600 : 400,
                  }}
                >
                  {tab}
                </Typography>

                {index === 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      height: 5,
                      width: "100%",
                      bgcolor: "#0088ff",
                    }}
                  />
                )}
              </Box>
            )
          )}
        </Box>
      </Box>

      {/* Lower benefits teaser */}
      <Box sx={{ maxWidth: 1180, mx: "auto", px: 4, py: 5 }}>
        <Stack direction="row" spacing={3}>
          <BenefitCard
            title="No collateral required"
            text="Apply for working capital financing without pledging business assets."
          />
          <BenefitCard
            title="Fast digital application"
            text="Retrieve verified business details via Singpass MyInfo Business."
          />
          <BenefitCard
            title="AI-assisted review"
            text="Applications undergo automated checks before Credit Approver review."
          />
        </Stack>
      </Box>

      {/* Floating calculator */}
      <Box
        sx={{
          position: "fixed",
          right: 38,
          bottom: 34,
          width: 76,
          height: 76,
          borderRadius: "50%",
          bgcolor: "#0088ff",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          boxShadow: "0 14px 30px rgba(0,136,255,.35)",
        }}
      >
        $
      </Box>
    </Box>
  );
}

function BenefitCard({ title, text }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: "1px solid #e5e7eb",
        flex: 1,
      }}
    >
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#005eb8" }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1.2, lineHeight: 1.6 }}>
        {text}
      </Typography>
    </Paper>
  );
}

function UOBLogo() {
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
    <img src="/uob-logo.png" alt="UOB" style={{ height: 58 }} />
    </Box>
  );
}