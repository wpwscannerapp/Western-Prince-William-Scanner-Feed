import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const StripeClient = {
  async createCheckoutSession(priceId: string, userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, userId },
      });

      if (error) {
        console.error('Error invoking create-checkout-session:', error);
        toast.error(`Failed to start subscription: ${error.message}`);
        return null;
      }

      if (data && data.checkoutUrl) {
        return data.checkoutUrl;
      } else {
        toast.error('Failed to get checkout URL from server.');
        return null;
      }
    } catch (error: any) {
      console.error('Unexpected error creating checkout session:', error);
      toast.error(`An unexpected error occurred: ${error.message}`);
      return null;
    }
  },
};