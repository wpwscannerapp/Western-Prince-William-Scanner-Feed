import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Loader2, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { toast } from 'sonner';

const TRAFFIC_REFRESH_INTERVAL = 60000; // Refresh every 60 seconds

interface TrafficEmbedResponse {
  embedUrl: string;
}

// Define a type for the error response
interface SupabaseError {
  message: string;
  code?: string;
}

const TrafficPage: React.FC = () => {
  const navigate = useNavigate();
  // Initialize location with a default value
  const [location, setLocation] = useState<string>('Gainesville, VA'); 
  const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTabActive, setIsTabActive] = useState(true);

  const fetchTrafficEmbedUrl = useCallback(async () => {
    if (!location.trim()) {
      toast.error('Please enter a valid location (city, zip code, or address).');
      return;
    }

    // Only set initial loading if it's not a refresh
    if (!isRefreshing) {
      setIsInitialLoading(true);
    }
    setError(null);

    try {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke<TrafficEmbedResponse>(
        'fetch-traffic-embed-url',
        {
          body: { location: location.trim() },
        }
      );

      if (edgeFunctionError) {
        throw edgeFunctionError as SupabaseError;
      }

      if (data?.embedUrl && typeof data.embedUrl === 'string') {
        setMapEmbedUrl(data.embedUrl);
      } else {
        throw new Error('No valid map embed URL received.');
      }
    } catch (err: unknown) {
      const errorMessage = handleError(err, 'Failed to fetch traffic map.');
      setError(errorMessage);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [location, isRefreshing]);

  // Handle tab visibility for pausing refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Initial fetch and interval-based refresh
  useEffect(() => {
    // Always fetch initially if location is set (which it now is by default)
    // and no map is loaded yet, and not already loading.
    if (location.trim() && !mapEmbedUrl && !isInitialLoading) {
      fetchTrafficEmbedUrl();
    }

    let intervalId: NodeJS.Timeout;
    if (isTabActive && mapEmbedUrl) {
      intervalId = setInterval(fetchTrafficEmbedUrl, TRAFFIC_REFRESH_INTERVAL);
    }

    return () => {
      if (intervalId) clearInterval(intervalId); // Cleanup on unmount or dependency change
    };
  }, [fetchTrafficEmbedUrl, isTabActive, mapEmbedUrl, location, isInitialLoading]);

  // Handle refresh button click
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTrafficEmbedUrl();
  };

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Dashboard
      </Button>
      <Card className="tw-bg-card tw-border-border tw-shadow-lg tw-text-center">
        <CardHeader>
          <Car className="tw-h-16 tw-w-16 tw-text-primary tw-mx-auto tw-mb-4" />
          <CardTitle className="tw-text-3xl tw-font-bold tw-text-foreground">Traffic Information</CardTitle>
          <CardDescription className="tw-text-muted-foreground tw-mt-2">
            Real-time road conditions and traffic alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6">
          <div className="tw-flex tw-gap-2 tw-mb-6">
            <Input
              placeholder="Enter city, zip code, or address (e.g., Gainesville, VA)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTrafficEmbedUrl()}
              disabled={isInitialLoading}
              className="tw-flex-1 tw-input"
              aria-label="Enter location for traffic information"
            />
            <Button onClick={fetchTrafficEmbedUrl} disabled={isInitialLoading} className="tw-button">
              {isInitialLoading ? (
                <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />
              ) : (
                <Search className="tw-h-4 tw-w-4" />
              )}
              <span className="tw-sr-only">Search Traffic</span>
            </Button>
          </div>

          {isInitialLoading && (
            <div
              className="tw-flex tw-justify-center tw-items-center tw-py-8"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
              <p className="tw-ml-2 tw-text-muted-foreground">Loading traffic map...</p>
            </div>
          )}

          {error && (
            <div className="tw-text-destructive tw-text-center tw-py-4" role="alert" aria-live="assertive">
              <p>{error}</p>
              <Button onClick={fetchTrafficEmbedUrl} variant="outline" className="tw-mt-2">
                Retry
              </Button>
            </div>
          )}

          {mapEmbedUrl && (
            <div className="tw-relative tw-w-full tw-h-[400px] sm:tw-h-[500px] tw-rounded-md tw-overflow-hidden tw-border tw-border-border tw-shadow-md">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer"
                src={mapEmbedUrl}
                title={`Traffic map for ${location || 'current location'}`}
              ></iframe>
              <div className="tw-absolute tw-bottom-2 tw-right-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isInitialLoading || isRefreshing}
                  className="tw-rounded-full tw-shadow-md"
                  aria-label="Refresh traffic map"
                >
                  <RefreshCw
                    className={isRefreshing ? 'tw-h-4 tw-w-4 tw-animate-spin' : 'tw-h-4 tw-w-4'}
                  />
                </Button>
              </div>
            </div>
          )}

          {!isInitialLoading && !error && !mapEmbedUrl && (
            <p className="tw-text-lg tw-text-muted-foreground">
              Enter a location above to view real-time traffic conditions.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(TrafficPage);