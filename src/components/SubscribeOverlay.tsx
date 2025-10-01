import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardTitle } from '@/components/ui/card'; // Import Card components

interface SubscribeOverlayProps {
  // Removed onSubscribe prop as navigation is now handled internally
}

const SubscribeOverlay: React.FC<SubscribeOverlayProps> = () => {
  const navigate = useNavigate();

  const handleSubscribeClick = () => {
    navigate('/subscribe');
  };

  return (
    <div className="tw-absolute tw-inset-0 tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background/80 tw-backdrop-blur-sm tw-z-20 tw-p-4 tw-rounded-lg">
      <Card className="tw-p-6 tw-max-w-sm tw-shadow-lg tw-text-center">
        <CardTitle className="tw-text-2xl tw-font-bold tw-text-foreground tw-mb-4">
          Unlock Exclusive Updates!
        </CardTitle>
        <CardContent className="tw-p-0">
          <p className="tw-text-muted-foreground tw-mb-6">
            Subscribe to get full access to real-time scanner posts and push notifications.
          </p>
          <Button onClick={handleSubscribeClick} className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-button">
            Subscribe Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscribeOverlay;