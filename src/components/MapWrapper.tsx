"use client";

import React, { Suspense, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { IncidentWithCoords } from '@/types/supabase';

// Dynamically import the IncidentMap component
const LazyIncidentMap = React.lazy(() => import('./IncidentMap'));

interface MapWrapperProps {
  incidents: IncidentWithCoords[];
}

const MapWrapper: React.FC<MapWrapperProps> = ({ incidents }) => {
  // Memoize the component to prevent unnecessary re-renders of the heavy map component
  const MapComponent = useMemo(() => (
    <Suspense fallback={
      <div className="tw-h-[500px] tw-w-full tw-flex tw-items-center tw-justify-center tw-bg-muted tw-rounded-md">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <span className="tw-ml-2 tw-text-muted-foreground">Loading Map...</span>
      </div>
    }>
      <LazyIncidentMap incidents={incidents} />
    </Suspense>
  ), [incidents]);

  return MapComponent;
};

export default MapWrapper;