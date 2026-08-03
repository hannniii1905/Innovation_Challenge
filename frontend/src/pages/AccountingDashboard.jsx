import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  useMediaQuery,
  useTheme,
  Modal,
  Menu,
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import AddCardRoundedIcon from "@mui/icons-material/AddCardRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import Drawer from "@mui/material/Drawer";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const SIDEBAR_WIDTH = 72;
const TOPNAV_HEIGHT = 72;

const NAV_ITEMS = [
  { icon: DashboardRoundedIcon, label: "Dashboard", active: true },
  { icon: AccountBalanceRoundedIcon, label: "Money" },
  { icon: ReceiptLongRoundedIcon, label: "Invoices" },
  { icon: RequestQuoteRoundedIcon, label: "Bills" },
  { icon: ShoppingBagRoundedIcon, label: "Bag" },
  { icon: AccountBalanceWalletRoundedIcon, label: "Bank" },
  { icon: CalendarMonthRoundedIcon, label: "Calendar" },
  { icon: Inventory2RoundedIcon, label: "Inventory" },
  { icon: CategoryRoundedIcon, label: "Products" },
  { icon: DescriptionRoundedIcon, label: "Documents" },
];

const BOTTOM_NAV_ITEMS = [
  { icon: SettingsRoundedIcon, label: "Settings" },
];

const CHART_LEGEND = [
  { label: "Upcoming", color: "#93c5fd" },
  { label: "1–30 Days", color: "#60a5fa" },
  { label: "31–60 Days", color: "#3b82f6" },
  { label: "61–90 Days", color: "#2563eb" },
  { label: "91+ Days", color: "#1d4ed8" },
];

const INVOICE_DATA = [
  { label: "Upcoming", width: "85%", color: "#93c5fd" },
  { label: "1–30 Days", width: "62%", color: "#60a5fa" },
  { label: "31–60 Days", width: "38%", color: "#3b82f6" },
  { label: "61–90 Days", width: "20%", color: "#2563eb" },
  { label: "91+ Days", width: "10%", color: "#1d4ed8" },
];

const BILL_DATA = [
  { label: "Upcoming", width: "72%", color: "#93c5fd" },
  { label: "1–30 Days", width: "55%", color: "#60a5fa" },
  { label: "31–60 Days", width: "30%", color: "#3b82f6" },
  { label: "61–90 Days", width: "15%", color: "#2563eb" },
  { label: "91+ Days", width: "8%", color: "#1d4ed8" },
];

function Sidebar({ activeItem, onItemClick, isMobile, open, onClose }) {
  const content = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: "100vh",
        bgcolor: "#20283a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1.5,
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 1200,
      }}
    >
      <Box
        component="img"
        src="/bukku.png"
        alt="Bukku"
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          objectFit: "contain",
          mb: 2,
          mt: 0.5,
        }}
      />

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const isActive = activeItem === i;
          return (
            <Tooltip key={item.label} title={item.label} placement="right" arrow>
              <IconButton
                onClick={() => onItemClick(i)}
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2.5,
                  bgcolor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon sx={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.45)", fontSize: 24 }} />
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, mb: 1 }}>
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.label} title={item.label} placement="right" arrow>
              <IconButton
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                <Icon sx={{ color: "rgba(255,255,255,0.45)", fontSize: 24 }} />
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>

      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          bgcolor: "#0d9488",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          mb: 1,
          boxShadow: "0 4px 12px rgba(13,148,136,0.4)",
          "&:hover": { bgcolor: "#0f766e", transform: "scale(1.05)" },
          transition: "all 0.2s",
        }}
      >
        <ChatBubbleRoundedIcon sx={{ color: "#ffffff", fontSize: 24 }} />
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { bgcolor: "#20283a", width: SIDEBAR_WIDTH } }}
      >
        {content}
      </Drawer>
    );
  }

  return content;
}

function TopNavbar({ onMenuClick, isMobile, onBack }) {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: isMobile ? 0 : SIDEBAR_WIDTH,
        right: 0,
        height: TOPNAV_HEIGHT,
        bgcolor: "#ffffff",
        boxShadow: "0 1px 2px rgba(0,0,0,.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: isMobile ? 2 : 4,
        zIndex: 1100,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {isMobile && (
          <IconButton onClick={onMenuClick} sx={{ color: "#6b7280" }}>
            <MenuRoundedIcon />
          </IconButton>
        )}
        <Tooltip title="Back to Home" arrow>
          <IconButton onClick={onBack} sx={{ color: "#6b7280", "&:hover": { color: "#1d8ad6" } }}>
            <ArrowBackRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>
        <RocketLaunchRoundedIcon sx={{ color: "#6b7280", fontSize: 22 }} />
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            border: "1.5px solid #d1d5db",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            "&:hover": { borderColor: "#1d8ad6" },
          }}
        >
          <AddRoundedIcon sx={{ color: "#6b7280", fontSize: 18 }} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <IconButton sx={{ color: "#6b7280" }}>
          <SearchRoundedIcon sx={{ fontSize: 22 }} />
        </IconButton>
        <Badge
          badgeContent={3}
          color="error"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: 10,
              height: 18,
              minWidth: 18,
            },
          }}
        >
          <IconButton sx={{ color: "#6b7280" }}>
            <NotificationsRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Badge>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #10b981)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>JD</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function LoanPromotionBanner({ onGetStarted }) {
  return (
    <Box
      sx={{
        width: "100%",
        height: 56,
        bgcolor: "#f5fff0",
        border: "1px solid #d7efbe",
        borderRadius: 2.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AttachMoneyRoundedIcon sx={{ color: "#fff", fontSize: 20 }} />
        </Box>
        <Typography sx={{ fontSize: 14, color: "#2f2f2f", fontWeight: 500 }}>
          Get pre-approved business loans up to RM200,000 from rates as low as 9.6% p.a. with{" "}
          <Box component="span" sx={{ fontWeight: 700 }}>Bukku Financing Portal</Box>.
        </Typography>
      </Box>
      <Box
        onClick={onGetStarted}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 1,
          borderRadius: 2,
          border: "1.5px solid #1d8ad6",
          bgcolor: "#ffffff",
          color: "#1d8ad6",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          whiteSpace: "nowrap",
          "&:hover": { bgcolor: "#f0f9ff" },
          transition: "all 0.15s",
        }}
      >
        Get Started
        <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
      </Box>
    </Box>
  );
}


function UobBizMoneyCampaignModal({ open, onClose, onApply }) {
  const benefits = [
    {
      title: "Fast digital application",
      description: "Apply in minutes through a simple and secure digital journey.",
    },
    {
      title: "No additional bank statement upload",
      description: "Your verified Bukku financial data helps speed up the assessment.",
    },
    {
      title: "Financing tailored to your business",
      description: "Explore financing options designed around your business needs.",
    },
  ];

  const handleClose = (event) => {
    event?.stopPropagation();
    onClose();
  };

  const handleApply = (event) => {
    event?.stopPropagation();
    onApply();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="uob-bizmoney-campaign-title"
      aria-describedby="uob-bizmoney-campaign-description"
    >
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 1.5, sm: 3 },
          py: 3,
          bgcolor: "rgba(7, 18, 36, 0.70)",
          backdropFilter: "blur(5px)",
        }}
      >
        <Box
          role="dialog"
          aria-modal="true"
          onClick={handleApply}
          sx={{
            position: "relative",
            width: { xs: "100%", sm: 780, md: 900 },
            maxWidth: "96vw",
            maxHeight: "94vh",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.08fr 0.92fr" },
            overflow: { xs: "auto", md: "hidden" },
            borderRadius: { xs: 4, md: 5 },
            bgcolor: "#ffffff",
            boxShadow: "0 36px 100px rgba(0, 0, 0, 0.42)",
            outline: "none",
            cursor: "pointer",
            isolation: "isolate",
          }}
        >
          <IconButton
            aria-label="Close UOB BizMoney campaign"
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: { xs: 14, md: 18 },
              right: { xs: 14, md: 18 },
              zIndex: 20,
              width: 46,
              height: 46,
              bgcolor: "rgba(255,255,255,0.96)",
              color: "#24364b",
              border: "1px solid rgba(148,163,184,0.28)",
              boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: "#ffffff",
                transform: "scale(1.06)",
              },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>

          {/* Left: campaign visual */}
          <Box
            sx={{
              position: "relative",
              minHeight: { xs: 560, md: 680 },
              overflow: "hidden",
              color: "#ffffff",
              backgroundImage: `
                linear-gradient(
                  180deg,
                  rgba(0, 30, 76, 0.36) 0%,
                  rgba(0, 59, 130, 0.66) 44%,
                  rgba(0, 33, 85, 0.88) 100%
                ),
                url("/UOB_building.jpg")
              `,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 72% 22%, rgba(57,189,248,0.28), transparent 36%), linear-gradient(135deg, rgba(0,94,184,0.32), transparent 52%)",
                pointerEvents: "none",
              }}
            />

            <Box
              sx={{
                position: "relative",
                zIndex: 2,
                height: "100%",
                minHeight: { xs: 560, md: 680 },
                p: { xs: 4, sm: 5, md: 5.5 },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                component="img"
                src="/UOB_white_logo.png"
                alt="UOB"
                sx={{
                  width: { xs: 158, sm: 180 },
                  height: "auto",
                  objectFit: "contain",
                  objectPosition: "left center",
                  display: "block",
                  mb: 4.5,
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.18))",
                }}
              />

              <Box
                sx={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  gap: 1,
                  px: 1.8,
                  py: 0.9,
                  mb: 2.8,
                  borderRadius: 999,
                  bgcolor: "rgba(14,165,233,0.18)",
                  border: "1px solid rgba(186,230,253,0.58)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: "#7dd3fc",
                    boxShadow: "0 0 14px rgba(125,211,252,0.9)",
                  }}
                />
                <Typography
                  sx={{
                    fontSize: { xs: 10.5, sm: 11.5 },
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  Exclusive for Bukku customers
                </Typography>
              </Box>

              <Typography
                id="uob-bizmoney-campaign-title"
                sx={{
                  maxWidth: 430,
                  mb: 2.5,
                  fontSize: { xs: 39, sm: 47, md: 52 },
                  fontWeight: 800,
                  lineHeight: 1.04,
                  letterSpacing: "-0.045em",
                  textShadow: "0 8px 28px rgba(0,0,0,0.22)",
                }}
              >
                Grow your business with UOB BizMoney
              </Typography>

              <Typography
                id="uob-bizmoney-campaign-description"
                sx={{
                  maxWidth: 390,
                  fontSize: { xs: 16, sm: 17.5 },
                  lineHeight: 1.68,
                  color: "rgba(255,255,255,0.92)",
                  textShadow: "0 3px 14px rgba(0,0,0,0.18)",
                }}
              >
                Get quick access to business financing using your verified Bukku
                financial information.
              </Typography>

              <Box
                sx={{
                  mt: "auto",
                  pt: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                <LockOutlinedIcon sx={{ fontSize: 17 }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                  Secure application powered by Bukku and UOB
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right: product benefits */}
          <Box
            sx={{
              position: "relative",
              minHeight: { xs: "auto", md: 680 },
              p: { xs: 4, sm: 5, md: 5.5 },
              pt: { xs: 5.5, md: 6.5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              bgcolor: "#ffffff",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 5,
                background: "linear-gradient(90deg, #ed1b2f 0 34%, #005eb8 34% 100%)",
              }}
            />

            <Typography
              sx={{
                mb: 1,
                color: "#005eb8",
                fontSize: 28,
                fontWeight: 1000,
                letterSpacing: "0.035em",
                textTransform: "uppercase",
              }}
            >
              UOB BizMoney
            </Typography>

            <Typography
              sx={{
                mb: 4.2,
                color: "#64748b",
                fontSize: 13.5,
                lineHeight: 1.55,
              }}
            >
              Business financing made simpler with your Bukku records.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3.2 }}>
              {benefits.map((benefit) => (
                <Box
                  key={benefit.title}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      bgcolor: "#eaf4ff",
                      color: "#0066c2",
                      border: "1px solid #d7eaff",
                    }}
                  >
                    <CheckRoundedIcon sx={{ fontSize: 24 }} />
                  </Box>

                  <Box sx={{ pt: 0.1 }}>
                    <Typography
                      sx={{
                        mb: 0.65,
                        color: "#1e293b",
                        fontSize: 18,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {benefit.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#64748b",
                        fontSize: 15,
                        lineHeight: 1.62,
                      }}
                    >
                      {benefit.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleApply}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                mt: 5,
                minHeight: 58,
                borderRadius: 3,
                bgcolor: "#005eb8",
                color: "#ffffff",
                fontSize: 18,
                fontWeight: 800,
                textTransform: "none",
                boxShadow: "0 14px 28px rgba(0,94,184,0.24)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "#004a91",
                  boxShadow: "0 18px 34px rgba(0,74,145,0.3)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              Check my financing options
            </Button>

            <Typography
              sx={{
                mt: 2.2,
                px: 1,
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 11.5,
                lineHeight: 1.55,
              }}
            >
              Click anywhere on this campaign to open the financing portal.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}


function FinancingPortalModal({ open, onClose, onContinue }) {
  const [consent, setConsent] = useState("yes");
  const [agreed, setAgreed] = useState(false);

  const canSubmit = consent === "yes" && agreed;

  const handleClose = () => {
    onClose();
    // Reset after the close transition so the next open starts fresh.
    setConsent("yes");
    setAgreed(false);
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(0,0,0,0.45)",
          p: 2,
        }}
      >
        <Box
          sx={{
            width: 720,
            maxWidth: "90vw",
            bgcolor: "#ffffff",
            borderRadius: 4,
            p: 4,
            boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
            fontFamily: "'Inter', 'Roboto', sans-serif",
            outline: "none",
          }}
        >
          <Typography sx={{ fontSize: 32, fontWeight: 700, color: "#222", mb: 3 }}>
            Financing Portal
          </Typography>

              <Box
                sx={{
                  bgcolor: "#F6FFF0",
                  border: "1px solid #CFEAB2",
                  borderRadius: 3,
                  p: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: 3.5,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    bgcolor: "#59B947",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <CheckRoundedIcon sx={{ color: "#fff", fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#2E6B1E", mb: 0.5 }}>
                    Congratulations! You&apos;ve been approved in principle
                  </Typography>
                  <Typography sx={{ fontSize: 15, lineHeight: 1.6, color: "#3D6B33" }}>
                    Your company qualifies for business financing of up to{" "}
                    <Box component="span" sx={{ fontWeight: 700 }}>RM200,000</Box>.
                    Review your consent to proceed with the application.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 1 }}>
                  <Box component="span" sx={{ color: "#555" }}>Consent</Box>
                </Typography>
                <Box
                  sx={{
                    height: 8,
                    borderRadius: "999px",
                    bgcolor: "#ECECEC",
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ width: "100%", height: "100%", bgcolor: "#2E7BEF", borderRadius: "999px" }} />
                </Box>
              </Box>

              <Typography sx={{ fontSize: 16, lineHeight: 1.6, color: "#444", mb: 3.5 }}>
                By giving consent, your data will be shared with United Overseas Bank Limited (UOB).
                This can increase your chance of getting loan approval and speed up your loan applications.
              </Typography>

              <Box sx={{ display: "flex", mb: 3.5 }}>
                <Box
                  onClick={() => setConsent(consent === "yes" ? "" : "yes")}
                  sx={{
                    height: 48,
                    border: "1px solid #D8DDE6",
                    borderRadius: 2,
                    overflow: "hidden",
                    display: "flex",
                    width: "fit-content",
                    cursor: "pointer",
                  }}
                >
                  <Box
                    sx={{
                      px: 3,
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      bgcolor: consent === "yes" ? "#2E7BEF" : "#ffffff",
                      color: consent === "yes" ? "#ffffff" : "#333",
                      fontWeight: 500,
                      fontSize: 15,
                      transition: "all 0.2s",
                      userSelect: "none",
                    }}
                  >
                    Consent on Data
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  bgcolor: "#F6FFF0",
                  border: "1px solid #CFEAB2",
                  borderRadius: 3,
                  p: 3,
                  display: "flex",
                  gap: 2,
                  mb: 3.5,
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    border: "1.5px solid #59B947",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    mt: 0.25,
                  }}
                >
                  <LockOutlinedIcon sx={{ color: "#59B947", fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: "#333", mb: 1 }}>
                    The following data will be shared with United Overseas Bank Limited (UOB):
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: "disc" }}>
                    <Box component="li" sx={{ fontSize: 16, lineHeight: 1.6, color: "#333", mb: 0.5 }}>
                      Your company&apos;s SSM number.
                    </Box>
                    <Box component="li" sx={{ fontSize: 16, lineHeight: 1.6, color: "#333", mb: 0.5 }}>
                      Your company&apos;s contact details.
                    </Box>
                    <Box component="li" sx={{ fontSize: 16, lineHeight: 1.6, color: "#333", mb: 0.5 }}>
                      Your company&apos;s e-invoices.
                    </Box>
                    <Box component="li" sx={{ fontSize: 16, lineHeight: 1.6, color: "#333", mb: 0.5 }}>
                      Your company&apos;s bank statements.
                    </Box>
                    <Box component="li" sx={{ fontSize: 16, lineHeight: 1.6, color: "#333", mb: 0.5 }}>
                      Your company&apos;s nature of business.
                    </Box>
                    <Box component="li" sx={{ fontSize: 16, lineHeight: 1.6, color: "#333" }}>
                      Your company&apos;s aggregated financials up to 12 months.
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Typography sx={{ fontSize: 16, color: "#777", mb: 2.5 }}>
                You may update your info and consent any time in the portal.
              </Typography>

              <Box
                onClick={() => setAgreed(!agreed)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  cursor: "pointer",
                  mb: 1,
                  userSelect: "none",
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: 1,
                    border: agreed ? "none" : "2px solid #D8DDE6",
                    bgcolor: agreed ? "#2E7BEF" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                >
                  {agreed && <CheckRoundedIcon sx={{ color: "#fff", fontSize: 16 }} />}
                </Box>
                <Typography sx={{ fontSize: 16, color: "#333" }}>
                  I agree to Bukku&apos;s{" "}
                  <Box
                    component="span"
                    sx={{
                      color: "#2E7BEF",
                      textDecoration: "underline",
                      "&:hover": { color: "#2563d1" },
                    }}
                  >
                    Terms of Service
                  </Box>{" "}
                  &{" "}
                  <Box
                    component="span"
                    sx={{
                      color: "#2E7BEF",
                      textDecoration: "underline",
                      "&:hover": { color: "#2563d1" },
                    }}
                  >
                    Privacy Policy
                  </Box>
                  .
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 5 }}>
                <Box
                  onClick={handleClose}
                  sx={{
                    height: 44,
                    px: 3,
                    borderRadius: 2,
                    border: "1px solid #D0D5DD",
                    bgcolor: "#ffffff",
                    color: "#555",
                    fontWeight: 500,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "#f5f5f5" },
                    transition: "all 0.15s",
                  }}
                >
                  Back to Dashboard
                </Box>
                <Box
                  onClick={() => canSubmit && onContinue?.()}
                  sx={{
                    height: 44,
                    px: 3.5,
                    borderRadius: 2,
                    bgcolor: canSubmit ? "#2E7BEF" : "#ccc",
                    color: "#fff",
                    fontWeight: 500,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    "&:hover": canSubmit ? { bgcolor: "#2563d1" } : {},
                    transition: "all 0.15s",
                  }}
                >
                  Submit
                </Box>
              </Box>
        </Box>
      </Box>
    </Modal>
  );
}

function SummaryCard({ icon, isPlus, label, amount, subtitle, bgColor }) {
  return (
    <Box
      sx={{
        height: 138,
        borderRadius: 2.5,
        bgcolor: bgColor,
        p: 3,
        display: "flex",
        alignItems: "flex-start",
        gap: 3,
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.5,
          border: "1.5px solid rgba(255,255,255,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isPlus ? (
          <AddCardRoundedIcon sx={{ color: "#fff", fontSize: 26 }} />
        ) : (
          <Typography sx={{ color: "#fff", fontSize: 28, fontWeight: 300, lineHeight: 1 }}>−</Typography>
        )}
      </Box>
      <Box>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.75,
            mb: 0.5,
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontSize: 38, fontWeight: 600, lineHeight: 1.1, mb: 0.5 }}>
          {amount}
        </Typography>
        <Typography sx={{ fontSize: 18, opacity: 0.85 }}>{subtitle}</Typography>
      </Box>
    </Box>
  );
}

function ChartBar({ label, width, color }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box
        sx={{
          height: 20,
          borderRadius: 1,
          bgcolor: color,
          width,
          transition: "width 0.6s ease",
        }}
      />
    </Box>
  );
}

function ChartCard({ title, data }) {
  return (
    <Box
      sx={{
        bgcolor: "#ffffff",
        borderRadius: 2.5,
        p: 3.5,
        height: 340,
        boxShadow: "0 2px 8px rgba(0,0,0,.05)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography
        sx={{
          fontSize: 34,
          fontWeight: 500,
          color: "#3378cc",
          mb: 3,
          lineHeight: 1.2,
        }}
      >
        {title}
      </Typography>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {data.map((bar) => (
          <ChartBar key={bar.label} label={bar.label} width={bar.width} color={bar.color} />
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 2.5, mt: 2, flexWrap: "wrap" }}>
        {CHART_LEGEND.map((item) => (
          <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: item.color,
              }}
            />
            <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function AccountingDashboard({ goBack, onContinueToUob }) {
  const [activeNav, setActiveNav] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [financingModalOpen, setFinancingModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const campaignTimer = window.setTimeout(() => {
      setCampaignModalOpen(true);
    }, 1500);

    return () => window.clearTimeout(campaignTimer);
  }, []);

  const openFinancingPortal = () => {
    setCampaignModalOpen(false);
    setFinancingModalOpen(true);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f4f5f7",
        fontFamily: "'Inter', 'Roboto', sans-serif",
      }}
    >
      <Sidebar
        activeItem={activeNav}
        onItemClick={(i) => setActiveNav(i)}
        isMobile={isMobile}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <TopNavbar onMenuClick={() => setDrawerOpen(true)} isMobile={isMobile} onBack={goBack} />

      <Box
        sx={{
          pt: `${TOPNAV_HEIGHT + 32}px`,
          pb: 4,
          px: 4,
          ml: isMobile ? 0 : `${SIDEBAR_WIDTH}px`,
          maxWidth: 1400,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <LoanPromotionBanner onGetStarted={openFinancingPortal} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: 3,
          }}
        >
          <SummaryCard
            icon="plus"
            isPlus={true}
            label="Invoices"
            amount="RM12,450.00"
            subtitle="Coming Due"
            bgColor="#1d8ad6"
          />
          <SummaryCard
            icon="minus"
            isPlus={false}
            label="Invoices"
            amount="RM3,200.00"
            subtitle="Overdue"
            bgColor="#1775c6"
          />
          <SummaryCard
            icon="plus"
            isPlus={true}
            label="Bills"
            amount="RM8,750.00"
            subtitle="Coming Due"
            bgColor="#1565a8"
          />
          <SummaryCard
            icon="minus"
            isPlus={false}
            label="Bills"
            amount="RM5,100.00"
            subtitle="Overdue"
            bgColor="#11528a"
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: 3,
          }}
        >
          <ChartCard title="Outstanding Invoices" data={INVOICE_DATA} />
          <ChartCard title="Outstanding Bills" data={BILL_DATA} />
        </Box>
      </Box>

      {isMobile && (
        <Box
          sx={{
            position: "fixed",
            bottom: 24,
            left: 24,
            width: 52,
            height: 52,
            borderRadius: "50%",
            bgcolor: "#0d9488",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(13,148,136,0.45)",
            cursor: "pointer",
            zIndex: 1300,
            "&:hover": { bgcolor: "#0f766e" },
          }}
        >
          <ChatBubbleRoundedIcon sx={{ color: "#fff", fontSize: 24 }} />
        </Box>
      )}
      <UobBizMoneyCampaignModal
        open={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        onApply={openFinancingPortal}
      />


        <FinancingPortalModal
          open={financingModalOpen}
          onClose={() => setFinancingModalOpen(false)}
          onContinue={onContinueToUob}
        />
    </Box>
  );
}