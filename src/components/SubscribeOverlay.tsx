import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
      <h2 className="tw-text-2xl tw-font-bold tw-text-foreground tw-mb-4 tw-text-center">
        Unlock Exclusive Updates!
      </h2>
      <p className="tw-text-muted-foreground tw-mb-6 tw-text-center">
        Subscribe to get full access to real-time scanner posts and push notifications.
      </p>
      <Button onClick={handleSubscribeClick} className="tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-mb-8">
        Subscribe Now
      </Button>
    </div>
  );
};

export default SubscribeOverlay;