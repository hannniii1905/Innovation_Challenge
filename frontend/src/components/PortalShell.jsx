import { Box, Paper, Typography, Chip, Divider } from "@mui/material";

export default function PortalShell({ application, children, sidebar = true }) {
  const p = application?.profile;

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
          py: 3,
          boxShadow: "0 8px 20px rgba(0,94,184,.18)",
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: "auto" }}>
          <Typography
            sx={{
              fontSize: 25,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            UOB Credit AI
          </Typography>

          <Typography
            sx={{
              opacity: 0.95,
              fontSize: 14,
              fontWeight: 600,
              mt: 0.5,
            }}
          >
            Secure Business Financing Journey
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: 1400,
          mx: "auto",
          p: 4,
          display: "grid",
          gridTemplateColumns: sidebar ? "280px 1fr" : "1fr",
          gap: 4,
        }}
      >
        {sidebar && p && (
          <Paper
            sx={{
              p: 3,
              borderRadius: 4,
              height: "fit-content",
              boxShadow: "0 12px 28px rgba(15,23,42,.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <Typography color="text.secondary" fontWeight={700} sx={{ mb: 2 }}>
              Company Profile
            </Typography>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  bgcolor: "#e6f0fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                🏢
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 15,
                    lineHeight: 1.25,
                    color: "#0f172a",
                  }}
                >
                  {p.companyName}
                </Typography>

                <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.3 }}>
                  UEN: {p.uen}
                </Typography>
              </Box>
            </Box>

            <Chip
              label={p.industry}
              sx={{
                width: "100%",
                height: "auto",
                py: 1,
                bgcolor: "#e6f0fa",
                color: "#005EB8",
                fontWeight: 600,
                whiteSpace: "normal",
              }}
            />

            <Divider sx={{ my: 3 }} />

            <Box sx={{ p: 3, borderRadius: 3, bgcolor: "#f8fafc" }}>
              <Typography fontWeight={700}>🔒 Secure Application</Typography>

              <Typography
                color="text.secondary"
                fontSize={9}
                sx={{ mt: 1, lineHeight: 1.2 }}
              >
                Your submission is protected with bank-grade access controls and encrypted handling.
              </Typography>
            </Box>
          </Paper>
        )}

        {children}
      </Box>
    </Box>
  );
}