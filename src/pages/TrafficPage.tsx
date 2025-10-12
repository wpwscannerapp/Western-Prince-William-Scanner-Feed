import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Info } from 'lucide-react';

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
            Real-time road conditions and traffic alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6">
          <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-8 tw-space-y-4">
            <Info className="tw-h-12 tw-w-12 tw-text-muted-foreground" />
            <p className="tw-text-lg tw-text-muted-foreground">
              Traffic information is not currently available.
            </p>
            <p className="tw-text-sm tw-text-muted-foreground">
              We are exploring new data sources to bring you the best real-time updates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(TrafficPage);