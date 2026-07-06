import { createTheme } from "@mui/material/styles";

// ---------------------------------------------------------------------------
// UOB brand palette + shared style tokens
// ---------------------------------------------------------------------------
export const uob = {
  navy: "#001A3F", // deep brand navy (dark headers / banners)
  navy2: "#002E5D",
  blue: "#005EB8", // primary UOB blue
  blueLight: "#0072CE",
  sky: "#00A3E0", // bright accent blue
  red: "#EB1C2D", // UOB logo red accent
  ink: "#0f172a",
  slate: "#64748b",
  tintBlue: "#e6f0fa", // light blue surface tint
  borderBlue: "#b3d1ec",
  surface: "#f5f9fd",
  pageBg: "#f4f7fb",
};

// Reusable gradients
export const gradients = {
  // Header / hero banners
  header: `linear-gradient(120deg, ${uob.navy} 0%, ${uob.navy2} 45%, ${uob.blue} 100%)`,
  // Primary buttons / CTAs
  button: `linear-gradient(90deg, ${uob.blue} 0%, ${uob.blueLight} 100%)`,
  // Subtle card header wash
  cardWash: `linear-gradient(90deg, rgba(230,240,250,0.9), rgba(255,255,255,0.9))`,
};

const theme = createTheme({
  palette: {
    primary: { main: uob.blue, dark: uob.navy2, light: uob.sky, contrastText: "#ffffff" },
    secondary: { main: uob.red, contrastText: "#ffffff" },
    background: { default: uob.pageBg, paper: "#ffffff" },
    text: { primary: uob.ink, secondary: uob.slate },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 800, letterSpacing: "-0.01em" },
    h6: { fontWeight: 800 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12 },
        containedPrimary: {
          background: gradients.button,
          "&:hover": {
            background: `linear-gradient(90deg, ${uob.navy2} 0%, ${uob.blue} 100%)`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
  },
});

export default theme;
