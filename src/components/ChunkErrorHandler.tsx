"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCcw, AlertTriangle } from 'lucide-react';
import { AnalyticsService } from '@/services/AnalyticsService';

interface ChunkErrorHandlerProps {
  children: React.ReactNode;
}

const ChunkErrorHandler: React.FC<ChunkErrorHandlerProps> = ({ children }) => {
  const [hasChunkError, setHasChunkError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Check if the error is likely a chunk load failure (dynamic import error)
      const isChunkError = event.message.includes('Failed to fetch dynamically imported module') || 
                           event.message.includes('Loading chunk') ||
                           event.message.includes('Dynamic import failed');

      if (isChunkError) {
        console.error('Caught Chunk Load Error:', event.message);
        AnalyticsService.trackEvent({ name: 'chunk_load_failure_detected', properties: { error: event.message } });
        setHasChunkError(true);
        // Prevent default to stop the error from propagating further if possible
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  const handleRefresh = () => {
    AnalyticsService.trackEvent({ name: 'chunk_load_failure_reloaded' });
    window.location.reload();
  };

  if (hasChunkError) {
    return (
      <div className="tw-min-h-screen tw-flex tw-col tw-items-center tw-justify-center tw-bg-background tw-p-4">
        <Card className="tw-w-full tw-max-w-md tw-text-center tw-bg-card tw-border-destructive tw-border-2 tw-shadow-lg">
          <CardHeader>
            <AlertTriangle className="tw-h-12 tw-w-12 tw-text-destructive tw-mx-auto tw-mb-4" />
            <CardTitle className="tw-text-2xl tw-font-bold tw-text-destructive">
              Application Update Required
            </CardTitle>
            <CardDescription className="tw-text-muted-foreground">
              A new version of the application is available. Please refresh to load the latest updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="tw-space-y-4">
            <Button onClick={handleRefresh} className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground">
              <RefreshCcw className="tw-mr-2 tw-h-4 tw-w-4" /> Refresh Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ChunkErrorHandler;