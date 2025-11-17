"use client";

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const StripeClient = {
  async createCheckoutSession(priceId: string, userId: string, userEmail: string): Promise<string | null> {
    try {
      // CRITICAL DEBUG LOG: Log the parameters being sent to the Edge Function
      if (import.meta.env.DEV) {
        console.log('StripeClient: Sending to create-checkout-session:', { priceId, userId, userEmail });
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, userId, userEmail }, // Pass userEmail here
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