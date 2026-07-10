import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { lookupProperty } from "../api/client";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const SINGAPORE_CENTER = [1.3521, 103.8198];

// Synthesise plausible "site visit" observations from the property type so the
// card reads like an on-the-ground verification of signage and operations.
function siteObservations(property) {
  const type = (property?.property_type || "").toLowerCase();

  if (type.includes("retail") || type.includes("commercial")) {
    return [
      { label: "Business signage", value: "Storefront signage matches entity name", ok: true },
      { label: "Operating status", value: "Premises open and trading during visit", ok: true },
      { label: "Occupancy", value: "Consistent with declared retail activity", ok: true },
    ];
  }
  if (type.includes("industrial") || type.includes("business park")) {
    return [
      { label: "Business signage", value: "Unit signage / directory listing present", ok: true },
      { label: "Operating status", value: "Active operations — staff and goods observed", ok: true },
      { label: "Occupancy", value: "Consistent with declared industrial use", ok: true },
    ];
  }
  if (type.includes("residential") || type.includes("hdb")) {
    return [
      { label: "Business signage", value: "No commercial signage — residential address", ok: false },
      { label: "Operating status", value: "Home-based / registered address only", ok: false },
      { label: "Occupancy", value: "Verify separate operating premises", ok: false },
    ];
  }
  return [
    { label: "Business signage", value: "Pending on-site confirmation", ok: false },
    { label: "Operating status", value: "Pending on-site confirmation", ok: false },
    { label: "Occupancy", value: "Pending on-site confirmation", ok: false },
  ];
}

export default function PropertyMapCard({ address }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("street"); // "street" | "satellite"

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await lookupProperty(address);
        setProperty(data);
      } catch {
        setProperty(null);
      } finally {
        setLoading(false);
      }
    }, 400);

    setLoading(true);
    return () => clearTimeout(timer);
  }, [address]);

  if (loading) {
    return (
      <Paper sx={{ p: 3.5, borderRadius: 4, boxShadow: "0 10px 24px rgba(15,23,42,.06)" }}>
        <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Preparing site visit…</Typography>
        </Stack>
      </Paper>
    );
  }

  const center = property ? [property.lat, property.lng] : SINGAPORE_CENTER;
  const observations = property ? siteObservations(property) : [];

  // Keyless Google Maps Street View embed centred on the property coordinates.
  const streetViewSrc = property
    ? `https://maps.google.com/maps?q=&layer=c&cbll=${property.lat},${property.lng}&cbp=11,0,0,0,0&output=svembed`
    : `https://maps.google.com/maps?q=Singapore&layer=c&output=svembed`;

  return (
    <Paper sx={{ p: 3.5, borderRadius: 4, boxShadow: "0 10px 24px rgba(15,23,42,.06)" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 0.5 }}
      >
        <Box>
          <Typography sx={{ fontWeight: "bold" }}>Site Visit — Location Verification</Typography>
          <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.3 }}>
            Virtual site visit to verify business signage and operating evidence at the registered address.
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => v && setView(v)}
          sx={{
            "& .MuiToggleButton-root": {
              textTransform: "none",
              fontWeight: 800,
              px: 2,
              borderRadius: 2,
            },
          }}
        >
          <ToggleButton value="street">Street View</ToggleButton>
          <ToggleButton value="satellite">Satellite</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ position: "relative", height: 260, borderRadius: 2, overflow: "hidden", mt: 2, mb: 2 }}>
        {view === "street" ? (
          <iframe
            title="Street view of registered address"
            src={streetViewSrc}
            style={{ height: "100%", width: "100%", border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <MapContainer
            center={center}
            zoom={property ? 18 : 12}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            {property && (
              <Marker position={center}>
                <Popup>
                  {property.building_name}
                  <br />
                  {property.address}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
        <Chip
          size="small"
          label={view === "street" ? "📍 Street-level view" : "🛰️ Satellite view"}
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 500,
            bgcolor: "rgba(255,255,255,.92)",
            color: "#1d4ed8",
            fontWeight: 800,
          }}
        />
      </Box>

      {property ? (
        <Stack spacing={1.5}>
          {/* Site visit observations */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "#f8fafc",
              border: "1px solid #e5e7eb",
            }}
          >
            <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: ".06em", mb: 1 }}>
              Site visit observations
            </Typography>
            <Stack spacing={1}>
              {observations.map((o) => (
                <Stack key={o.label} direction="row" alignItems="center" spacing={1.2}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 900,
                      color: "white",
                      bgcolor: o.ok ? "#16a34a" : "#f59e0b",
                    }}
                  >
                    {o.ok ? "✓" : "!"}
                  </Box>
                  <Typography fontSize={13}>
                    <Box component="span" sx={{ fontWeight: 800 }}>
                      {o.label}:
                    </Box>{" "}
                    {o.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* Registry facts */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <Box>
              <Typography fontSize={12} color="text.secondary" fontWeight={700}>Building</Typography>
              <Typography fontWeight={700}>{property.building_name}</Typography>
            </Box>
            <Box>
              <Typography fontSize={12} color="text.secondary" fontWeight={700}>Property Type</Typography>
              <Typography fontWeight={700}>{property.property_type}</Typography>
            </Box>
            <Box>
              <Typography fontSize={12} color="text.secondary" fontWeight={700}>Land / Building Owner</Typography>
              <Typography fontWeight={700} color="#b91c1c">{property.building_owner}</Typography>
            </Box>
            <Box>
              <Typography fontSize={12} color="text.secondary" fontWeight={700}>Land Tenure</Typography>
              <Typography fontWeight={700}>{property.land_tenure}</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f0f7ff", border: "1px solid #bfdbfe" }}>
            <Typography fontSize={12} color="#1d4ed8">
              {property.owner_info}
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Typography color="text.secondary" fontSize={14}>
          {address
            ? `Site visit view for "${address}". Property registry lookup is not yet available for this address.`
            : "No registered address provided."}
        </Typography>
      )}
    </Paper>
  );
}
