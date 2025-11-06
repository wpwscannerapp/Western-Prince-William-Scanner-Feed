import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { IncidentWithCoords } from '@/types/supabase';
import { L, initializeLeafletIcons } from '@/lib/leafletConfig';

interface IncidentMapProps {
  incidents: IncidentWithCoords[];
}

const IncidentMap: React.FC<IncidentMapProps> = ({ incidents }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Initialize Leaflet global configuration here, ensuring it runs only on the client.
    initializeLeafletIcons();
    setIsClient(true);
  }, []);

  const { fireIcon, policeIcon, defaultIcon } = useMemo(() => {
    if (!isClient) {
      return { fireIcon: null, policeIcon: null, defaultIcon: null };
    }

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

    return { fireIcon, policeIcon, defaultIcon };
  }, [isClient]);

  const getIconForAlertType = (type: string) => {
    const lowerCaseType = type.toLowerCase();
    if (lowerCaseType.includes('fire')) return fireIcon!;
    if (lowerCaseType.includes('police') || lowerCaseType.includes('crime')) return policeIcon!;
    return defaultIcon!;
  };

  if (!isClient || !fireIcon) {
    // This fallback should ideally never be seen if MapWrapper handles the loading
    return null;
  }

  return (
    <MapContainer
      center={[38.65, -77.34]} // Center on Prince William County
      zoom={13}
      scrollWheelZoom={false}
      className="tw-h-[500px] tw-w-full tw-rounded-md tw-shadow-md tw-z-10"
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