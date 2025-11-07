import React, { useState, useMemo } from 'react';
import Map, { Marker, Popup, MapboxEvent, MapboxMouseEvent } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { IncidentWithCoords } from '@/types/supabase';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';

// Default view state centered around Prince William County, VA
const INITIAL_VIEW_STATE = {
  longitude: -77.34,
  latitude: 38.65,
  zoom: 11,
};

interface IncidentMapProps {
  incidents: IncidentWithCoords[];
}

const IncidentMap: React.FC<IncidentMapProps> = ({ incidents }) => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [popupInfo, setPopupInfo] = useState<IncidentWithCoords | null>(null);

  const markers = useMemo(() => incidents.map((incident) => {
    const isFire = incident.type.toLowerCase().includes('fire');
    const isPolice = incident.type.toLowerCase().includes('police') || incident.type.toLowerCase().includes('crime');
    const color = isFire ? 'hsl(var(--destructive))' : isPolice ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';

    return (
      <Marker
        key={incident.id}
        longitude={incident.longitude}
        latitude={incident.latitude}
        anchor="bottom"
        onClick={(e: MapboxMouseEvent) => {
          e.originalEvent.stopPropagation();
          setPopupInfo(incident);
        }}
      >
        <div className="tw-relative tw-cursor-pointer" aria-label={`Incident marker: ${incident.title}`}>
          <MapPin 
            className="tw-h-8 tw-w-8 tw-shadow-lg" 
            style={{ color }} 
            fill={color}
          />
        </div>
      </Marker>
    );
  }), [incidents]);

  return (
    <Map
      {...viewState}
      onMove={(evt: MapboxEvent) => setViewState(evt.viewState)}
      mapLib={maplibregl}
      style={{ width: '100%', height: '100%' }}
      mapStyle="https://api.maptiler.com/maps/streets/style.json?key=YOUR_MAPTILER_API_KEY_HERE" // Using a generic style URL
      // Note: For production, you should replace the MapTiler URL with a valid key or use a self-hosted style.
      // MapLibre GL JS works well with OpenStreetMap data sources.
      initialViewState={INITIAL_VIEW_STATE}
      attributionControl={false}
    >
      {markers}

      {popupInfo && (
        <Popup
          anchor="top"
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          onClose={() => setPopupInfo(null)}
          closeButton={true}
          closeOnClick={false}
        >
          <div className="tw-p-1 tw-max-w-xs">
            <h3 className="tw-font-bold tw-text-sm tw-text-foreground">{popupInfo.title}</h3>
            <p className="tw-text-xs tw-text-muted-foreground tw-mt-1">{popupInfo.description}</p>
            <p className="tw-text-xs tw-text-muted-foreground tw-mt-1">Type: {popupInfo.type}</p>
            <p className="tw-text-xs tw-text-muted-foreground">Posted: {format(new Date(popupInfo.created_at!), 'MMM dd, hh:mm a')}</p>
          </div>
        </Popup>
      )}
    </Map>
  );
};

export default IncidentMap;