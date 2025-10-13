import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';


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
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const initMap = () => {
      if (mapRef.current && window.google) {
        const googleMap = new window.google.maps.Map(mapRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: zoom,
          mapId: 'WPW_TRAFFIC_MAP', // Use a map ID for cloud-based map styling
          disableDefaultUI: true, // Disable default UI for a cleaner look
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: false,
        });
        setMap(googleMap);
        setMapLoading(false);
      } else {
        console.warn('Google Maps API not loaded or mapRef not available.');
        // If API isn't loaded, try again after a short delay
        if (!window.google) {
          setTimeout(initMap, 500);
        }
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      // The script tag in index.html should load the API globally
      // We'll rely on that, but add a fallback check
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps);
          initMap();
        }
      }, 100); // Check every 100ms
      return () => clearInterval(checkGoogleMaps);
    }
  }, [centerLat, centerLng, zoom]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    incidents.forEach(incident => {
      const position = { lat: incident.from.lat, lng: incident.from.lon };
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: incident.description,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#FF0000', // Red for incidents
          fillOpacity: 0.8,
          strokeWeight: 0,
          scale: 8,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="tw-p-2">
            <h4 class="tw-font-bold tw-text-base tw-mb-1">${incident.description}</h4>
            <p class="tw-text-sm tw-text-gray-700">${incident.fullDescription}</p>
            <p class="tw-text-xs tw-text-gray-500 tw-mt-1">Delay: ${Math.round(incident.delay / 60)} min</p>
            <p class="tw-text-xs tw-text-gray-500">From: ${incident.from.value}</p>
            <p class="tw-text-xs tw-text-gray-500">To: ${incident.to.value}</p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });
  }, [map, incidents]);

  return (
    <div className="tw-relative tw-w-full tw-h-[400px] tw-rounded-lg tw-overflow-hidden tw-shadow-md tw-border tw-border-border">
      {mapLoading && (
        <div className="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-background/80 tw-z-10">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
          <p className="tw-ml-2 tw-text-muted-foreground">Loading map...</p>
        </div>
      )}
      <div ref={mapRef} className="tw-w-full tw-h-full" aria-label="Google Map displaying traffic incidents" />
    </div>
  );
};

export default TrafficMap;