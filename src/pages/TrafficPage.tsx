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

const TrafficPage: React.FC = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState<string>('Gainesville, VA'); // Default location
  const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrafficEmbedUrl = useCallback(async () => {
    if (!location) {
      toast.error('Please enter a location (city, zip code, or address).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('fetch-traffic-embed-url', {
        body: { location },
      });

      if (edgeFunctionError) {
        throw edgeFunctionError;
      }

      if (data && data.embedUrl) {
        setMapEmbedUrl(data.embedUrl);
      } else {
        setError('No map embed URL received.');
      }
    } catch (err: any) {
      setError(handleError(err, 'Failed to fetch traffic map.'));
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchTrafficEmbedUrl(); // Initial fetch

    const intervalId = setInterval(fetchTrafficEmbedUrl, TRAFFIC_REFRESH_INTERVAL);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchTrafficEmbedUrl]);

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
              disabled={loading}
              className="tw-flex-1 tw-input"
            />
            <Button onClick={fetchTrafficEmbedUrl} disabled={loading} className="tw-button">
              {loading ? <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" /> : <Search className="tw-h-4 tw-w-4" />}
              <span className="tw-sr-only">Search Traffic</span>
            </Button>
          </div>

          {loading && (
            <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
              <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
              <p className="tw-ml-2 tw-text-muted-foreground">Loading traffic map...</p>
            </div>
          )}

          {error && (
            <div className="tw-text-destructive tw-text-center tw-py-4">
              <p>{error}</p>
              <Button onClick={fetchTrafficEmbedUrl} variant="outline" className="tw-mt-2">Retry</Button>
            </div>
          )}

          {mapEmbedUrl && (
            <div className="tw-relative tw-w-full tw-h-[400px] tw-rounded-md tw-overflow-hidden tw-border tw-border-border tw-shadow-md">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbedUrl}
                title="Google Maps Traffic"
              ></iframe>
              <div className="tw-absolute tw-bottom-2 tw-right-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={fetchTrafficEmbedUrl}
                  disabled={loading}
                  className="tw-rounded-full tw-shadow-md"
                  aria-label="Refresh traffic map"
                >
                  <RefreshCw className={loading ? "tw-h-4 tw-w-4 tw-animate-spin" : "tw-h-4 tw-w-4"} />
                </Button>
              </div>
            </div>
          )}
          {!loading && !error && !mapEmbedUrl && (
            <p className="tw-text-lg tw-text-muted-foreground">
              Enter a location above to view real-time traffic conditions.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrafficPage;