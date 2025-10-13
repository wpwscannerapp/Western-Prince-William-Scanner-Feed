import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Info, MapPin, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { format } from 'date-fns';
import TrafficMap from '@/components/TrafficMap'; // Import the new map component

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
  // Add other fields as needed from TomTom API response
}

const TrafficPage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<TomTomIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default bounding box for Prince William County, VA (approximate)
  // Format: minLat,minLon,maxLat,maxLon
  const defaultBoundingBox = '38.60,-77.60,38.80,-77.20'; 
  const defaultZoom = 10; // Adjust zoom level as needed
  const defaultCenterLat = 38.75; // Center for the map
  const defaultCenterLng = -77.45;

  const fetchTrafficIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('fetch-tomtom-incidents', {
        body: {
          boundingBox: defaultBoundingBox,
          zoom: defaultZoom,
          language: 'en-US',
        },
      });

      if (edgeFunctionError) {
        handleError(edgeFunctionError, 'Failed to fetch traffic incidents from server.');
        setError(edgeFunctionError.message);
        return;
      }

      if (data && data.trafficIncidents && data.trafficIncidents.incidents) {
        setIncidents(data.trafficIncidents.incidents);
      } else {
        setIncidents([]);
        setError('No traffic incident data found for this area.');
      }
    } catch (err) {
      setError(handleError(err, 'An unexpected error occurred while fetching traffic information.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrafficIncidents();
  }, [fetchTrafficIncidents]);

  const getDelayColor = (magnitudeOfDelay: number) => {
    switch (magnitudeOfDelay) {
      case 0: return 'tw-text-green-500'; // No delay
      case 1: return 'tw-text-yellow-500'; // Minor delay
      case 2: return 'tw-text-orange-500'; // Moderate delay
      case 3: return 'tw-text-red-500';    // Major delay
      case 4: return 'tw-text-purple-500'; // Unknown/Severe
      default: return 'tw-text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading traffic information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error</h1>
          <p className="tw-text-muted-foreground">{error}</p>
          <Button onClick={fetchTrafficIncidents} className="tw-mt-4 tw-button">Retry</Button>
          <Button onClick={() => navigate('/home')} variant="outline" className="tw-mt-4 tw-ml-2 tw-button">Go to Home Page</Button>
        </div>
      </div>
    );
  }

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
            Real-time road conditions and traffic alerts for Prince William County, VA.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6">
          <TrafficMap incidents={incidents} centerLat={defaultCenterLat} centerLng={defaultCenterLng} zoom={defaultZoom} />
          
          <h2 className="tw-text-2xl tw-font-bold tw-text-foreground tw-mt-8 tw-mb-4 tw-text-left">Current Incidents</h2>
          {incidents.length > 0 ? (
            <div className="tw-space-y-6 tw-text-left">
              {incidents.map((incident) => (
                <Card key={incident.id} className="tw-bg-background tw-border-border tw-shadow-sm tw-p-4">
                  <div className="tw-flex tw-items-center tw-gap-2 tw-mb-2">
                    <AlertTriangle className={`tw-h-5 tw-w-5 ${getDelayColor(incident.magnitudeOfDelay)}`} />
                    <h3 className="tw-text-lg tw-font-semibold tw-text-foreground">{incident.description}</h3>
                  </div>
                  <p className="tw-text-sm tw-text-muted-foreground tw-mb-2">{incident.fullDescription}</p>
                  <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-foreground tw-mb-1">
                    <MapPin className="tw-h-4 tw-w-4 tw-text-secondary" />
                    <span>{incident.from.value} to {incident.to.value}</span>
                  </div>
                  <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-foreground">
                    <Clock className="tw-h-4 tw-w-4 tw-text-secondary" />
                    <span>
                      Delay: {Math.round(incident.delay / 60)} min | Start: {format(new Date(incident.startTime), 'MMM dd, hh:mm a')}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-8 tw-space-y-4">
              <Info className="tw-h-12 tw-w-12 tw-text-muted-foreground" />
              <p className="tw-text-lg tw-text-muted-foreground">
                No traffic incidents reported for this area at the moment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(TrafficPage);