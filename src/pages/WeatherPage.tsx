import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CloudSun, Loader2, MapPin, Thermometer, Wind, Droplet, AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { toast } from 'sonner';

interface WeatherData {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
}

interface WeatherAlert {
  event: string;
  description: string;
  sender_name: string;
  start: number; // Unix timestamp
  end: number;   // Unix timestamp
}

const WeatherPage: React.FC = () => {
  const navigate = useNavigate();
  const [city, setCity] = useState<string>('Gainesville'); // Default city
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    if (!city) {
      toast.error('Please enter a city or zip code.');
      return;
    }

    setLoading(true);
    setError(null);
    setWeatherData(null);
    setWeatherAlerts([]);

    try {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('fetch-weather', {
        body: { city },
      });

      if (edgeFunctionError) {
        throw edgeFunctionError;
      }

      if (data && data.weather) {
        setWeatherData(data.weather);
        setWeatherAlerts(data.alerts || []);
      } else {
        setError('No weather data received.');
      }
    } catch (err: any) {
      setError(handleError(err, 'Failed to fetch weather data.'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch weather for default city on component mount
  React.useEffect(() => {
    fetchWeather();
  }, []);

  const getWeatherIconUrl = (iconCode: string) => `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Dashboard
      </Button>
      <Card className="tw-bg-card tw-border-border tw-shadow-lg tw-text-center">
        <CardHeader>
          <CloudSun className="tw-h-16 tw-w-16 tw-text-primary tw-mx-auto tw-mb-4" />
          <CardTitle className="tw-text-3xl tw-font-bold tw-text-foreground">Weather Updates</CardTitle>
          <CardDescription className="tw-text-muted-foreground tw-mt-2">
            Real-time local weather conditions and alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6">
          <div className="tw-flex tw-gap-2 tw-mb-6">
            <Input
              placeholder="Enter city or zip code, e.g., Gainesville or 20155"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchWeather()}
              disabled={loading}
              className="tw-flex-1 tw-input"
            />
            <Button onClick={fetchWeather} disabled={loading} className="tw-button">
              {loading ? <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" /> : <Search className="tw-h-4 tw-w-4" />}
              <span className="tw-sr-only">Search Weather</span>
            </Button>
          </div>

          {loading && (
            <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
              <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
              <p className="tw-ml-2 tw-text-muted-foreground">Fetching weather...</p>
            </div>
          )}

          {error && (
            <div className="tw-text-destructive tw-text-center tw-py-4">
              <p>{error}</p>
              <Button onClick={fetchWeather} variant="outline" className="tw-mt-2">Retry</Button>
            </div>
          )}

          {weatherData && (
            <div className="tw-space-y-6 tw-text-left">
              <div className="tw-flex tw-items-center tw-justify-center tw-gap-4 tw-mb-4">
                {weatherData.weather[0]?.icon && (
                  <img
                    src={getWeatherIconUrl(weatherData.weather[0].icon)}
                    alt={weatherData.weather[0].description}
                    className="tw-w-20 tw-h-20"
                  />
                )}
                <div>
                  <h3 className="tw-text-4xl tw-font-bold tw-text-foreground">{Math.round(weatherData.main.temp)}°F</h3>
                  <p className="tw-text-lg tw-text-muted-foreground tw-capitalize">{weatherData.weather[0]?.description}</p>
                </div>
              </div>

              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
                <div className="tw-flex tw-items-center tw-gap-2 tw-bg-muted/30 tw-p-3 tw-rounded-md">
                  <MapPin className="tw-h-5 tw-w-5 tw-text-primary" />
                  <span className="tw-text-foreground">{weatherData.name}</span>
                </div>
                <div className="tw-flex tw-items-center tw-gap-2 tw-bg-muted/30 tw-p-3 tw-rounded-md">
                  <Thermometer className="tw-h-5 tw-w-5 tw-text-primary" />
                  <span className="tw-text-foreground">Feels like: {Math.round(weatherData.main.feels_like)}°F</span>
                </div>
                <div className="tw-flex tw-items-center tw-gap-2 tw-bg-muted/30 tw-p-3 tw-rounded-md">
                  <Wind className="tw-h-5 tw-w-5 tw-text-primary" />
                  <span className="tw-text-foreground">Wind: {Math.round(weatherData.wind.speed)} mph</span>
                </div>
                <div className="tw-flex tw-items-center tw-gap-2 tw-bg-muted/30 tw-p-3 tw-rounded-md">
                  <Droplet className="tw-h-5 tw-w-5 tw-text-primary" />
                  <span className="tw-text-foreground">Humidity: {weatherData.main.humidity}%</span>
                </div>
              </div>

              {weatherAlerts.length > 0 && (
                <div className="tw-mt-6 tw-space-y-3">
                  <h4 className="tw-text-xl tw-font-semibold tw-text-destructive tw-flex tw-items-center tw-gap-2">
                    <AlertTriangle className="tw-h-6 tw-w-6" /> Weather Alerts
                  </h4>
                  {weatherAlerts.map((alert, index) => (
                    <Card key={index} className="tw-bg-destructive/10 tw-border-destructive tw-text-destructive-foreground tw-p-4 tw-text-left">
                      <p className="tw-font-bold tw-mb-1">{alert.event} from {alert.sender_name}</p>
                      <p className="tw-text-sm">{alert.description}</p>
                      <p className="tw-text-xs tw-mt-2">
                        Valid from {new Date(alert.start * 1000).toLocaleString()} to {new Date(alert.end * 1000).toLocaleString()}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          {!loading && !error && !weatherData && (
            <p className="tw-text-lg tw-text-muted-foreground">
              Enter a city above to get real-time local weather conditions and alerts.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherPage;