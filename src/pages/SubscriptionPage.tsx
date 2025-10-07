import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Lock, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { StripeClient } from '@/integrations/stripe/client';
import { useIsSubscribed } from '@/hooks/useIsSubscribed';
import { handleError } from '@/utils/errorHandler';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSubscribed, loading: isSubscribedLoading } = useIsSubscribed();
  const [isLoading, setIsLoading] = React.useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!authLoading && !isSubscribedLoading && isSubscribed) {
      toast.info('You are already subscribed!');
      navigate('/home');
    }
  }, [isSubscribed, isSubscribedLoading, authLoading, navigate]);

  const handleStartFreeTrial = async () => {
    if (!user || !user.email) {
      handleError(null, 'You must be logged in to start a free trial.');
      navigate('/auth');
      return;
    }

    setIsLoading(true);
    toast.loading('Initiating subscription...', { id: 'sub-loading' });

    try {
      const priceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID;
      if (!priceId) {
        handleError(null, 'Stripe price ID is not configured. Please contact support.');
        toast.dismiss('sub-loading');
        setIsLoading(false);
        return;
      }

      const checkoutUrl = await StripeClient.createCheckoutSession(priceId, user.id, user.email);

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        handleError(null, 'Failed to initiate Stripe checkout. Please try again.');
        toast.dismiss('sub-loading');
      }
    } catch (err: any) {
      handleError(err, 'An unexpected error occurred during subscription.');
      toast.dismiss('sub-loading');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isSubscribedLoading || (isSubscribed && !authLoading && !isSubscribedLoading)) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Checking subscription status...</p>
      </div>
    );
  }

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
      <Card className="tw-w-full tw-max-w-2xl tw-bg-card tw-border-border tw-shadow-lg tw-text-center">
        <CardHeader>
          <CardTitle className="tw-text-3xl tw-font-bold tw-text-primary">Premium Access</CardTitle>
          <CardDescription className="tw-text-muted-foreground tw-mt-2">
            Unlock the full WPW Scanner Feed experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-space-y-6">
          {/* Plan Comparison */}
          <div className="tw-grid tw-grid-cols-1 tw-gap-4 tw-mb-6 tw-justify-center" role="grid" aria-label="Subscription Plan Comparison">
            <Card className="tw-border-primary tw-border-2 tw-shadow-md tw-max-w-md tw-mx-auto" role="rowheader">
              <CardHeader>
                <CardTitle className="tw-text-xl tw-text-primary">Premium Plan</CardTitle>
              </CardHeader>
              <CardContent className="tw-text-left">
                <ul className="tw-space-y-2 tw-text-foreground">
                  <li className="tw-flex tw-items-center"><CheckCircle className="tw-h-4 tw-w-4 tw-text-primary tw-mr-2" /> Full post access</li>
                  <li className="tw-flex tw-items-center"><CheckCircle className="tw-h-4 tw-w-4 tw-text-primary tw-mr-2" /> Ad-free experience</li>
                  <li className="tw-flex tw-items-center"><CheckCircle className="tw-h-4 tw-w-4 tw-text-primary tw-mr-2" /> Real-time push notifications</li>
                  <li className="tw-flex tw-items-center"><CheckCircle className="tw-h-4 tw-w-4 tw-text-primary tw-mr-2" /> Exclusive posts</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="tw-text-4xl tw-font-extrabold tw-text-foreground">
            ${import.meta.env.VITE_STRIPE_PRICE || '5.99'}<span className="tw-text-xl tw-font-medium tw-text-muted-foreground">/month</span>
          </div>
          <p className="tw-text-lg tw-text-muted-foreground">
            Start your 7-day free trial today!
          </p>

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
            className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-text-lg tw-py-6 tw-transition tw-duration-300 hover:tw-shadow-glow tw-button"
            disabled={isLoading}
            aria-label="Start free trial subscription"
          >
            {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            Start Free Trial
          </Button>

          <p className="tw-xs tw-text-muted-foreground tw-mt-4">
            By subscribing, you agree to our <Link to="/terms-of-service" className="tw-underline hover:tw-text-primary">Terms of Service</Link>.
          </p>
          {/* Trust Signals */}
          <p className="tw-sm tw-text-muted-foreground tw-flex tw-items-center tw-justify-center">
            <Lock className="tw-h-4 tw-w-4 tw-mr-1" /> Secure payments via Stripe — Join over <span className="tw-font-bold tw-text-primary tw-mx-1">20,000</span> scanner fans!
          </p>
        </CardContent>
      </Card>
      <footer className="tw-w-full tw-py-4 tw-text-center tw-text-xs tw-text-muted-foreground tw-mt-8">
        © {currentYear} Western Prince William Scanner Feed. All rights reserved.
      </footer>
    </div>
  );
};

export default SubscriptionPage;