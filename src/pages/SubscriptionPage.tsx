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
    if (!user) {
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

      const checkoutUrl = await StripeClient.createCheckoutSession(priceId, user.id);

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Premium Access</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Unlock the full WPW Scanner Feed experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-4xl font-extrabold text-foreground">
            $5.99<span className="text-xl font-medium text-muted-foreground">/month</span>
          </div>
          <p className="text-lg text-muted-foreground">
            Start your 7-day free trial today!
          </p>

          <ul className="text-left space-y-2 mb-6">
            <li className="flex items-center text-foreground">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> Ad-free access
            </li>
            <li className="flex items-center text-foreground">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> Real-time push notifications
            </li>
            <li className="flex items-center text-foreground">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> Exclusive posts
            </li>
            <li className="flex items-center text-foreground">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> Cancel anytime
            </li>
          </ul>

          <div className="bg-muted p-4 rounded-md text-muted-foreground text-sm">
            <p className="mb-2">
              <Lock className="inline-block h-4 w-4 mr-1" /> Secure payment via Stripe.
            </p>
            <p>
              You will be redirected to Stripe to complete your subscription.
            </p>
          </div>

          <Button
            onClick={handleStartFreeTrial}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Free Trial
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            By subscribing, you agree to our <a href="#" className="underline hover:text-primary">Terms of Service</a>.
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center">
            <Lock className="h-4 w-4 mr-1" /> Secure payments via Stripe — Join 20,000+ followers.
          </p>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default SubscriptionPage;