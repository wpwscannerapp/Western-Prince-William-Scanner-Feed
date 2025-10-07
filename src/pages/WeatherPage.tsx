import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CloudSun } from 'lucide-react';

const WeatherPage: React.FC = () => {
  const navigate = useNavigate();

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
          <p className="tw-text-lg tw-text-foreground tw-mb-4">
            This page will soon feature detailed weather forecasts, radar, and severe weather alerts for Western Prince William County.
          </p>
          <p className="tw-text-sm tw-text-muted-foreground">
            Stay informed about current conditions and upcoming changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherPage;