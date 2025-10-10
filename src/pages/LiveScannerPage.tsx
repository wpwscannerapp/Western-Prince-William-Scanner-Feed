import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Radio } from 'lucide-react';

const LiveScannerPage: React.FC = () => {
  const navigate = useNavigate();

  // Placeholder for a live audio stream URL
  const liveStreamUrl = "https://example.com/your-live-scanner-feed.mp3"; // Replace with your actual stream URL

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Dashboard
      </Button>
      <Card className="tw-bg-card tw-border-border tw-shadow-lg tw-text-center">
        <CardHeader>
          <Radio className="tw-h-16 tw-w-16 tw-text-primary tw-mx-auto tw-mb-4" />
          <CardTitle className="tw-text-3xl tw-font-bold tw-text-foreground">Live Scanner Feed</CardTitle>
          <CardDescription className="tw-text-muted-foreground tw-mt-2">
            Listen to real-time public safety radio communications.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6">
          <p className="tw-text-lg tw-text-foreground tw-mb-4">
            Tune in to the live scanner feed for Western Prince William County.
          </p>
          <div className="tw-my-6">
            {/* Audio player for the live stream */}
            <audio controls className="tw-w-full tw-rounded-md tw-shadow-md">
              <source src={liveStreamUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <p className="tw-text-xs tw-text-muted-foreground tw-mt-2">
              (Note: This is a placeholder. Replace the audio source with your actual live stream URL.)
            </p>
          </div>
          <p className="tw-text-sm tw-text-muted-foreground">
            Stay informed with live updates as they happen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveScannerPage;