import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  useMediaQuery,
  useTheme,
  Modal,
  Select,
  MenuItem,
  FormControl,
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
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import Drawer from "@mui/material/Drawer";

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

function FinancingPortalModal({ open, onClose }) {
  const [step, setStep] = useState(1);
  const [sector, setSector] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [consent, setConsent] = useState("");
  const [agreed, setAgreed] = useState(false);

  const canNext = sector && category && subCategory;
  const canSubmit = consent === "yes" && agreed;

  const handleBackToStep1 = () => setStep(1);

  return (
    <Modal open={open} onClose={onClose}>
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

          {step === 1 ? (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 1 }}>
                  <Box component="span" sx={{ color: "#555" }}>Step 1 of 2: </Box>
                  <Box component="span" sx={{ color: "#2E7BEF" }}>Nature of business</Box>
                </Typography>
                <Box
                  sx={{
                    height: 8,
                    borderRadius: "999px",
                    bgcolor: "#ECECEC",
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ width: "50%", height: "100%", bgcolor: "#2E7BEF", borderRadius: "999px" }} />
                </Box>
              </Box>

              <Typography sx={{ fontSize: 16, lineHeight: 1.6, color: "#444", mb: 4 }}>
                Tell us about your nature of business and stand a bigger chance of getting pre-approved
                financing options. Select the most relevant one if you&apos;re in multiple lines of business.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <FormControl fullWidth>
                  <Typography sx={{ fontSize: 16, fontWeight: 500, color: "#333", mb: 0.5 }}>
                    <Box component="span" sx={{ color: "#d32f2f", mr: 0.5 }}>*</Box>
                    Sector
                  </Typography>
                  <Select
                    value={sector}
                    onChange={(e) => {
                      setSector(e.target.value);
                      setCategory("");
                      setSubCategory("");
                    }}
                    displayEmpty
                    IconComponent={KeyboardArrowDownRoundedIcon}
                    sx={{
                      height: 52,
                      borderRadius: 2,
                      fontSize: 16,
                      color: sector ? "#333" : "#A8A8A8",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#D8DDE6",
                        borderRadius: 2,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#2E7BEF",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#2E7BEF",
                        boxShadow: "0 0 0 3px rgba(46,123,239,0.12)",
                      },
                    }}
                  >
                    <MenuItem value="" disabled>Select Sector</MenuItem>
                    <MenuItem value="manufacturing">Manufacturing</MenuItem>
                    <MenuItem value="services">Services</MenuItem>
                    <MenuItem value="retail">Retail</MenuItem>
                    <MenuItem value="technology">Technology</MenuItem>
                    <MenuItem value="construction">Construction</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <Typography sx={{ fontSize: 16, fontWeight: 500, color: "#333", mb: 0.5 }}>
                    <Box component="span" sx={{ color: "#d32f2f", mr: 0.5 }}>*</Box>
                    Category
                  </Typography>
                  <Select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSubCategory("");
                    }}
                    displayEmpty
                    disabled={!sector}
                    IconComponent={KeyboardArrowDownRoundedIcon}
                    sx={{
                      height: 52,
                      borderRadius: 2,
                      fontSize: 16,
                      color: category ? "#333" : "#A8A8A8",
                      bgcolor: !sector ? "#F5F5F5" : "#fff",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#D8DDE6",
                        borderRadius: 2,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: sector ? "#2E7BEF" : "#D8DDE6",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#2E7BEF",
                        boxShadow: "0 0 0 3px rgba(46,123,239,0.12)",
                      },
                      "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#D8DDE6",
                      },
                      "&.Mui-disabled": {
                        color: "#A8A8A8",
                      },
                    }}
                  >
                    <MenuItem value="" disabled>Select Category</MenuItem>
                    <MenuItem value="electronics">Electronics</MenuItem>
                    <MenuItem value="textiles">Textiles</MenuItem>
                    <MenuItem value="food">Food & Beverage</MenuItem>
                    <MenuItem value="consulting">Consulting</MenuItem>
                    <MenuItem value="software">Software</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <Typography sx={{ fontSize: 16, fontWeight: 500, color: "#333", mb: 0.5 }}>
                    <Box component="span" sx={{ color: "#d32f2f", mr: 0.5 }}>*</Box>
                    Sub-category
                  </Typography>
                  <Select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    displayEmpty
                    disabled={!category}
                    IconComponent={KeyboardArrowDownRoundedIcon}
                    sx={{
                      height: 52,
                      borderRadius: 2,
                      fontSize: 16,
                      color: subCategory ? "#333" : "#A8A8A8",
                      bgcolor: !category ? "#F5F5F5" : "#fff",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#D8DDE6",
                        borderRadius: 2,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: category ? "#2E7BEF" : "#D8DDE6",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#2E7BEF",
                        boxShadow: "0 0 0 3px rgba(46,123,239,0.12)",
                      },
                      "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#D8DDE6",
                      },
                      "&.Mui-disabled": {
                        color: "#A8A8A8",
                      },
                    }}
                  >
                    <MenuItem value="" disabled>Select Sub-category</MenuItem>
                    <MenuItem value="components">Components</MenuItem>
                    <MenuItem value="assembly">Assembly</MenuItem>
                    <MenuItem value="organic">Organic</MenuItem>
                    <MenuItem value="imported">Imported</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 5 }}>
                <Box
                  onClick={onClose}
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
                  onClick={() => canNext && setStep(2)}
                  sx={{
                    height: 44,
                    px: 3.5,
                    borderRadius: 2,
                    bgcolor: canNext ? "#2E7BEF" : "#ccc",
                    color: "#fff",
                    fontWeight: 500,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    cursor: canNext ? "pointer" : "not-allowed",
                    "&:hover": canNext ? { bgcolor: "#2563d1" } : {},
                    transition: "all 0.15s",
                  }}
                >
                  Next
                </Box>
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 1 }}>
                  <Box component="span" sx={{ color: "#555" }}>Step 2 of 2: </Box>
                  <Box component="span" sx={{ color: "#2E7BEF" }}>Consent</Box>
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
                By giving consent, your <Box component="span" sx={{ fontWeight: 700 }}>non-identifiable data</Box> might
                be shared with our lending partners. This can increase your chance of getting loan
                approval and speed up your loan applications.
              </Typography>

              <Box sx={{ display: "flex", mb: 3.5 }}>
                <Box
                  sx={{
                    height: 48,
                    border: "1px solid #D8DDE6",
                    borderRadius: 2,
                    overflow: "hidden",
                    display: "flex",
                    width: "fit-content",
                  }}
                >
                  <Box
                    onClick={() => setConsent("no")}
                    sx={{
                      px: 3,
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      bgcolor: consent === "no" ? "#2E7BEF" : "#ffffff",
                      color: consent === "no" ? "#ffffff" : "#333",
                      fontWeight: 500,
                      fontSize: 15,
                      transition: "all 0.2s",
                      borderRight: "1px solid #D8DDE6",
                      userSelect: "none",
                    }}
                  >
                    No Consent
                  </Box>
                  <Box
                    onClick={() => setConsent("yes")}
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
                    Consent on Non-Identifiable Data
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
                    The following <Box component="span" sx={{ fontWeight: 700 }}>non-identifiable data</Box> might be shared with our lending partners:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: "disc" }}>
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
                  onClick={onClose}
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
                  onClick={handleBackToStep1}
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
                  Back
                </Box>
                <Box
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
            </>
          )}
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

export default function AccountingDashboard({ goBack }) {
  const [activeNav, setActiveNav] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [financingModalOpen, setFinancingModalOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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
        <LoanPromotionBanner onGetStarted={() => setFinancingModalOpen(true)} />

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

      <FinancingPortalModal
        open={financingModalOpen}
        onClose={() => setFinancingModalOpen(false)}
      />
    </Box>
  );
}
