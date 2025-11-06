"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { IncidentWithCoords } from '@/types/supabase';

// Define the type for the dynamically imported component
type IncidentMapComponent = React.ComponentType<{ incidents: IncidentWithCoords[] }>;

interface MapWrapperProps {
  incidents: IncidentWithCoords[];
}

const MapWrapper: React.FC<MapWrapperProps> = ({ incidents }) => {
  const [IncidentMapComponent, setIncidentMapComponent] = useState<IncidentMapComponent | null>(null);
  const [loadingError, setLoadingError] = useState<boolean>(false);

  useEffect(() => {
    // Perform dynamic import only on the client side
    import('./IncidentMap')
      .then(module => {
        if (!module.default) {
          console.error('IncidentMap missing default export!', module);
          setLoadingError(true);
          return;
        }
        setIncidentMapComponent(() => module.default);
      })
      .catch(err => {
        console.error('Map component failed to load dynamically:', err);
        setLoadingError(true);
      });
  }, []);

  if (loadingError) {
    return (
      <div className="tw-h-[500px] tw-w-full tw-flex tw-items-center tw-justify-center tw-bg-destructive/10 tw-rounded-md">
        <span className="tw-ml-2 tw-text-destructive">Map component failed to load.</span>
      </div>
    );
  }

  if (!IncidentMapComponent) {
    return (
      <div className="tw-h-[500px] tw-w-full tw-flex tw-items-center tw-justify-center tw-bg-muted tw-rounded-md">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <span className="tw-ml-2 tw-text-muted-foreground">Loading Map...</span>
      </div>
    );
  }

  // Render the dynamically loaded component
  return <IncidentMapComponent incidents={incidents} />;
};

export default MapWrapper;