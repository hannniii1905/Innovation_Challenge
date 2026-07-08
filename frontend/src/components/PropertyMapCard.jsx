import { useEffect, useState } from "react";
import { Box, Paper, Typography, Stack, Chip, CircularProgress, Alert } from "@mui/material";
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

export default function PropertyMapCard({ address }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!address) {
      setLoading(false);
      setError("No address provided.");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await lookupProperty(address);
        setProperty(data);
        setError("");
      } catch (err) {
        setProperty(null);
        setError(err.message || "Unable to look up property details.");
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
          <Typography color="text.secondary">Looking up property details…</Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3.5, borderRadius: 4, boxShadow: "0 10px 24px rgba(15,23,42,.06)" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: "bold" }}>Property & Location Details</Typography>
        <Chip size="small" label={property ? "Land & Building Registry" : "Satellite View"} sx={{ bgcolor: "#dbeafe", color: "#1d4ed8", fontWeight: 800 }} />
      </Stack>

      <Box sx={{ height: 220, borderRadius: 2, overflow: "hidden", mb: 2 }}>
        <MapContainer center={property ? [property.lat, property.lng] : SINGAPORE_CENTER} zoom={property ? 18 : 12} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {property && (
            <Marker position={[property.lat, property.lng]}>
              <Popup>{property.building_name}<br />{property.address}</Popup>
            </Marker>
          )}
        </MapContainer>
      </Box>

      {property ? (
        <Stack spacing={1.5}>
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
            ? `Showing satellite view of Singapore. Property registry lookup for "${address}" is not yet available.`
            : "Showing satellite view of Singapore."}
        </Typography>
      )}
    </Paper>
  );
}
