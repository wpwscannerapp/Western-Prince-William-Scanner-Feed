import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as tt from '@tomtom-international/web-sdk-maps';
import '@tomtom-international/web-sdk-maps/dist/maps.css'; // Import TomTom map styles
import { handleError } from '@/utils/errorHandler';

interface TomTomIncident {
  id: string;
  iconCategory: number;
  magnitudeOfDelay: number;
  trafficModelId: string;
  startTime: string;
  endTime: string;
  from: {
    value: string;
    lat: number;
    lon: number;
  };
  to: {
    value: string;
    lat: number;
    lon: number;
  };
  length: number;
  delay: number;
  roadNumbers: string[];
  description: string;
  cause: string;
  impact: number;
  fullDescription: string;
}

interface TrafficMapProps {
  incidents: TomTomIncident[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
}

const TrafficMap: React.FC<TrafficMapProps> = ({
  incidents,
  centerLat = 38.75, // Approximate center of Prince William County, VA
  centerLng = -77.45,
  zoom = 10,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<tt.Map | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const markersRef = useRef<tt.Marker[]>([]);

  useEffect(() => {
    const tomtomApiKey = import.meta.env.VITE_TOMTOM_API_KEY;
    console.log('TrafficMap: VITE_TOMTOM_API_KEY value:', tomtomApiKey ? 'Present' : 'Missing');

    if (!tomtomApiKey) {
      handleError(null, 'TomTom API key is missing. Please set VITE_TOMTOM_API_KEY in your .env file.');
      setMapLoading(false);
      return;
    }

    if (mapRef.current && !mapInstance) {
      const map = tt.map({
        key: tomtomApiKey,
        container: mapRef.current,
        center: [centerLng, centerLat], // TomTom uses [lng, lat]
        zoom: zoom,
        // Use the full HTTPS URL for the map style, including the API key
        style: `https://api.tomtom.com/map/1/style/20.0.0/basic-main.json?key=${tomtomApiKey}`,
      });

      map.on('load', () => {
        setMapInstance(map);
        setMapLoading(false);
        console.log('TomTom Map loaded successfully.'); // This log should appear if map loads
      });

      map.on('error', (e) => {
        console.error('TomTom Map error:', e); // This error should appear if map fails
        handleError(e, 'Failed to load TomTom map.');
        setMapLoading(false);
      });

      return () => {
        if (map) {
          map.remove();
          setMapInstance(null);
        }
      };
    }
  }, [centerLat, centerLng, zoom, mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    incidents.forEach(incident => {
      const markerElement = document.createElement('div');
      markerElement.className = 'tw-w-4 tw-h-4 tw-rounded-full tw-bg-red-600 tw-border-2 tw-border-white tw-shadow-md';
      markerElement.title = incident.description;

      const marker = new tt.Marker({
        element: markerElement,
        anchor: 'bottom',
      })
        .setLngLat([incident.from.lon, incident.from.lat]) // TomTom uses [lng, lat]
        .addTo(mapInstance);

      const popup = new tt.Popup({
        offset: { bottom: [0, -20] },
        closeButton: false,
        closeOnClick: true,
      }).setHTML(`
        <div class="tw-p-2 tw-max-w-xs">
          <h4 class="tw-font-bold tw-text-base tw-mb-1">${incident.description}</h4>
          <p class="tw-text-sm tw-text-gray-700">${incident.fullDescription}</p>
          <p class="tw-text-xs tw-text-gray-500 tw-mt-1">Delay: ${Math.round(incident.delay / 60)} min</p>
          <p class="tw-text-xs tw-text-gray-500">From: ${incident.from.value}</p>
          <p class="tw-text-xs tw-text-gray-500">To: ${incident.to.value}</p>
        </div>
      `);

      marker.setPopup(popup);
      markersRef.current.push(marker);
    });
  }, [mapInstance, incidents]);

  return (
    <div className="tw-relative tw-w-full tw-h-[400px] tw-rounded-lg tw-overflow-hidden tw-shadow-md tw-border tw-border-border">
      {mapLoading && (
        <div className="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-background/80 tw-z-10">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
          <p className="tw-ml-2 tw-text-muted-foreground">Loading map...</p>
        </div>
      )}
      <div ref={mapRef} className="tw-w-full tw-h-full" aria-label="TomTom Map displaying traffic incidents" />
    </div>
  );
};

export default TrafficMap;