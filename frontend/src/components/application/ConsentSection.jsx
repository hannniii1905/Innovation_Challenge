import {
  Card,
  CardContent,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
} from "@mui/material";

export default function ConsentSection({ application, setApplication }) {
  const consent = application.consent || {};

  const update = (field, value) => {
    setApplication((prev) => ({
      ...prev,
      consent: {
        ...prev.consent,
        [field]: value,
      },
    }));
  };

  const items = [
    {
      field: "creditBureau",
      label:
        "I authorise the Bank to retrieve and review the applicant’s Credit Bureau information for the purpose of assessing this application.",
    },
    {
      field: "acra",
      label:
        "I consent to the Bank obtaining and reviewing the applicant company’s corporate registry and business profile information, including information from ACRA and other authorised sources.",
    },
    {
      field: "screening",
      label:
        "I consent to the Bank conducting verification, fraud screening, litigation screening, sanctions screening, and other internal risk checks as may be reasonably required for credit assessment.",
    },
    {
      field: "declaration",
      label:
        "I confirm that all information and documents provided in connection with this application are true, accurate and complete to the best of my knowledge.",
    },
  ];

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
            Declaration and Consent
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.8, fontSize: 14 }}>
            Please review and acknowledge the following consent items before submission.
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          <Box
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid #e5e7eb",
              borderRadius: 3,
              p: 2,
            }}
          >
            <FormGroup>
              {items.map((item) => (
                <Box
                  key={item.field}
                  sx={{
                    p: 2,
                    borderBottom:
                      item.field === "declaration" ? "none" : "1px solid #e5e7eb",
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={consent[item.field] || false}
                        onChange={(e) => update(item.field, e.target.checked)}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: 14.5, lineHeight: 1.6 }}>
                        {item.label}
                      </Typography>
                    }
                  />
                </Box>
              ))}
            </FormGroup>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}