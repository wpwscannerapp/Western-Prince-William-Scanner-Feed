import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car } from 'lucide-react';

const TrafficPage: React.FC = () => {
  const navigate = useNavigate();

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
            Current road conditions and traffic alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6">
          <p className="tw-text-lg tw-text-foreground tw-mb-4">
            This page will provide real-time traffic updates, incident reports, and estimated travel times for key routes in Western Prince William County.
          </p>
          <p className="tw-text-sm tw-text-muted-foreground">
            Plan your commute and avoid delays with up-to-the-minute information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrafficPage;