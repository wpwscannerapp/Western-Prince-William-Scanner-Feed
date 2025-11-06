"use client";

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { IncidentWithCoords } from '@/types/supabase';

// Use React.lazy to dynamically import the map component
const LazyIncidentMap = React.lazy(() => 
  import('./IncidentMap').catch(err => {
    console.error('Failed to load IncidentMap chunk:', err);
    throw err;
  })
);

interface MapWrapperProps {
  incidents: IncidentWithCoords[];
}

const MapWrapper: React.FC<MapWrapperProps> = ({ incidents }) => {
  return (
    <div className="tw-h-[500px] tw-w-full tw-rounded-md tw-shadow-md">
      <Suspense fallback={
        <div className="tw-h-full tw-w-full tw-flex tw-items-center tw-justify-center tw-bg-muted tw-rounded-md">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
          <span className="tw-ml-2 tw-text-muted-foreground">Loading Map...</span>
        </div>
      }>
        <LazyIncidentMap incidents={incidents} />
      </Suspense>
    </div>
  );
};

export default MapWrapper;