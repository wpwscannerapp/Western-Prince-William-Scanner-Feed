import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IncidentWithCoords } from '@/types/supabase'; // Import IncidentWithCoords
import { Loader2 } from 'lucide-react'; // Import Loader2

interface IncidentMapProps {
  incidents: IncidentWithCoords[]; // Use IncidentWithCoords
}

// Fix for default marker icons not loading correctly in Webpack/Vite environments
// This is a common fix required for Leaflet to find its default assets.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


const IncidentMap: React.FC<IncidentMapProps> = ({ incidents }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This ensures the map components only mount after the initial render cycle
    setIsClient(true);
  }, []);

  // Custom icons based on alert type
  const fireIcon = new L.DivIcon({
    className: 'tw-custom-div-icon',
    html: `<div class="tw-bg-destructive tw-rounded-full tw-p-1 tw-shadow-md"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="24px" width="24px" style="color: white;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const policeIcon = new L.DivIcon({
    className: 'tw-custom-div-icon',
    html: `<div class="tw-bg-primary tw-rounded-full tw-p-1 tw-shadow-md"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="24px" width="24px" style="color: white;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const defaultIcon = new L.DivIcon({
    className: 'tw-custom-div-icon',
    html: `<div class="tw-bg-gray-500 tw-rounded-full tw-p-1 tw-shadow-md"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="24px" width="24px" style="color: white;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const getIconForAlertType = (type: string) => {
    const lowerCaseType = type.toLowerCase();
    if (lowerCaseType.includes('fire')) return fireIcon;
    if (lowerCaseType.includes('police') || lowerCaseType.includes('crime')) return policeIcon;
    return defaultIcon;
  };

  if (!isClient) {
    return (
      <div className="tw-h-[500px] tw-w-full tw-flex tw-items-center tw-justify-center tw-bg-muted tw-rounded-md">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <span className="tw-ml-2 tw-text-muted-foreground">Initializing Map...</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={[38.65, -77.34]} // Center on Prince William County
      zoom={13}
      scrollWheelZoom={false}
      className="tw-h-[500px] tw-w-full tw-rounded-md tw-shadow-md tw-z-10" // Added z-10 to ensure map is above other elements if needed
      aria-label="Interactive map of incidents"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.latitude, incident.longitude]}
          icon={getIconForAlertType(incident.type)}
          aria-label={`Incident: ${incident.title}`}
        >
          <Popup>
            <div className="tw-font-bold tw-text-foreground">{incident.title}</div>
            <div className="tw-text-sm tw-text-muted-foreground">{incident.description}</div>
            <div className="tw-text-xs tw-text-muted-foreground tw-mt-1">Type: {incident.type}</div>
            <div className="tw-text-xs tw-text-muted-foreground">Posted: {new Date(incident.created_at!).toLocaleString()}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default IncidentMap;