import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Alert } from '@/services/NotificationService';

// Removed the workaround for default Leaflet icons:
// delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface IncidentMapProps {
  alerts: Alert[];
}

const IncidentMap: React.FC<IncidentMapProps> = ({ alerts }) => {
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
      {alerts.map((alert) => (
        <Marker
          key={alert.id}
          position={[alert.latitude, alert.longitude]}
          icon={getIconForAlertType(alert.type)}
          aria-label={`Incident: ${alert.title}`}
        >
          <Popup>
            <div className="tw-font-bold tw-text-foreground">{alert.title}</div>
            <div className="tw-text-sm tw-text-muted-foreground">{alert.description}</div>
            <div className="tw-text-xs tw-text-muted-foreground tw-mt-1">Type: {alert.type}</div>
            <div className="tw-text-xs tw-text-muted-foreground">Posted: {new Date(alert.created_at).toLocaleString()}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default IncidentMap;