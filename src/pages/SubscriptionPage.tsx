import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Lock, Loader2 } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client'; // Updated import path

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
      // Update the user's subscription status in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: 'trialing' })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating subscription status:', error);
        toast.error(`Failed to start free trial: ${error.message}`, { id: 'sub-loading' });
      } else {
        toast.success('Subscription active! Enjoy your 7-day free trial.', { id: 'sub-loading' });
        navigate('/home'); // Redirect to home page after successful subscription
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

          {/* Placeholder for Stripe Payment Form */}
          <div className="bg-muted p-4 rounded-md text-muted-foreground text-sm">
            <p className="mb-2">
              <Lock className="inline-block h-4 w-4 mr-1" /> Secure payment via Stripe.
            </p>
            <p>
              (A real Stripe payment form would appear here, requiring a backend to create a checkout session.)
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