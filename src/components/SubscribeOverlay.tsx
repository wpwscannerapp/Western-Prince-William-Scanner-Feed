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
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20 p-4 rounded-lg">
      <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
        Unlock Exclusive Updates!
      </h2>
      <p className="text-muted-foreground mb-6 text-center">
        Subscribe to get full access to real-time scanner posts and push notifications.
      </p>
      <Button onClick={handleSubscribeClick} className="bg-blue-600 hover:bg-blue-700 text-white">
        Subscribe Now
      </Button>
    </div>
  );
};

export default SubscribeOverlay;