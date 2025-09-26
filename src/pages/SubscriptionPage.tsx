import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Lock, Loader2 } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { StripeClient } from '@/integrations/stripe/client'; // Import StripeClient

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleStartFreeTrial = async () => {
    if (!user || !user.email) { // Ensure user and user.email exist
      toast.error('You must be logged in to start a free trial.');
      navigate('/auth');
      return;
    }

    setIsLoading(true);
    toast.loading('Initiating subscription...', { id: 'sub-loading' });

    try {
      const priceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID;
      if (!priceId) {
        toast.error('Stripe price ID is not configured. Please contact support.', { id: 'sub-loading' });
        setIsLoading(false);
        return;
      }

      // Pass user.email to the createCheckoutSession function
      const checkoutUrl = await StripeClient.createCheckoutSession(priceId, user.id, user.email);

      if (checkoutUrl) {
        window.location.href = checkoutUrl; // Redirect to Stripe Checkout
      } else {
        toast.error('Failed to initiate Stripe checkout. Please try again.', { id: 'sub-loading' });
      }
    } catch (err: any) {
      console.error('Unexpected error during subscription:', err);
      toast.error(`An unexpected error occurred: ${err.message}`, { id: 'sub-loading' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
      <Card className="tw-w-full tw-max-w-md tw-bg-card tw-border-border tw-shadow-lg tw-text-center">
        <CardHeader>
          <CardTitle className="tw-text-3xl tw-font-bold tw-text-primary">Premium Access</CardTitle>
          <CardDescription className="tw-text-muted-foreground tw-mt-2">
            Unlock the full WPW Scanner Feed experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-space-y-6">
          <div className="tw-text-4xl tw-font-extrabold tw-text-foreground">
            $5.99<span className="tw-text-xl tw-font-medium tw-text-muted-foreground">/month</span>
          </div>
          <p className="tw-text-lg tw-text-muted-foreground">
            Start your 7-day free trial today!
          </p>

          <ul className="tw-text-left tw-space-y-2 tw-mb-6">
            <li className="tw-flex tw-items-center tw-text-foreground">
              <CheckCircle className="tw-h-5 tw-w-5 tw-text-green-500 tw-mr-2" /> Ad-free access
            </li>
            <li className="tw-flex tw-items-center tw-text-foreground">
              <CheckCircle className="tw-h-5 tw-w-5 tw-text-green-500 tw-mr-2" /> Real-time push notifications
            </li>
            <li className="tw-flex tw-items-center tw-text-foreground">
              <CheckCircle className="tw-h-5 tw-w-5 tw-text-green-500 tw-mr-2" /> Exclusive posts
            </li>
            <li className="tw-flex tw-items-center tw-text-foreground">
              <CheckCircle className="tw-h-5 tw-w-5 tw-text-green-500 tw-mr-2" /> Cancel anytime
            </li>
          </ul>

          <div className="tw-bg-muted tw-p-4 tw-rounded-md tw-text-muted-foreground tw-text-sm">
            <p className="tw-mb-2">
              <Lock className="tw-inline-block tw-h-4 tw-w-4 tw-mr-1" /> Secure payment via Stripe.
            </p>
            <p>
              You will be redirected to Stripe to complete your subscription.
            </p>
          </div>

          <Button
            onClick={handleStartFreeTrial}
            className="tw-w-full tw-bg-green-600 hover:tw-bg-green-700 tw-text-white tw-text-lg tw-py-6"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            Start Free Trial
          </Button>

          <p className="tw-text-xs tw-text-muted-foreground tw-mt-4">
            By subscribing, you agree to our <a href="#" className="tw-underline hover:tw-text-primary">Terms of Service</a>.
          </p>
          <p className="tw-text-sm tw-text-muted-foreground tw-flex tw-items-center tw-justify-center">
            <Lock className="tw-h-4 tw-w-4 tw-mr-1" /> Secure payments via Stripe — Join 20,000+ followers.
          </p>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default SubscriptionPage;