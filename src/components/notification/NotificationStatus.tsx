"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsService } from '@/services/AnalyticsService';
import { IDLE_TIMEOUT_MS, NotificationSettingsFormValues, UseRealtimeAlertsResult } from './types';
import { useAuth } from '@/context/AuthContext';

interface NotificationStatusProps {
  isWebPushInitialized: boolean;
}

export const NotificationStatus: React.FC<NotificationStatusProps> = ({ isWebPushInitialized }) => {
  const { watch } = useFormContext<NotificationSettingsFormValues>();
  const preferPushNotifications = watch('prefer_push_notifications');
  const { user } = useAuth();
  const { alertRealtimeStatus } = useRealtimeAlerts(user, preferPushNotifications);

  return (
    <div className="tw-space-y-2">
      <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
        <span className="tw-font-medium">Real-time Alerts Status:</span>
        {alertRealtimeStatus === 'connecting' && (
          <span className="tw-flex tw-items-center tw-gap-1 tw-text-muted-foreground">
            <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" /> Connecting...
          </span>
        )}
        {alertRealtimeStatus === 'active' && (
          <span className="tw-flex tw-items-center tw-gap-1 tw-text-green-600">
            <CheckCircle2 className="tw-h-4 tw-w-4" aria-hidden="true" /> Active
          </span>
        )}
        {alertRealtimeStatus === 'failed' && (
          <span className="tw-flex tw-items-center tw-gap-1 tw-text-destructive">
            <XCircle className="tw-h-4 tw-w-4" aria-hidden="true" /> Failed
          </span>
        )}
      </div>
      {!isWebPushInitialized && (
        <p className="tw-text-destructive tw-text-sm tw-flex tw-items-center tw-gap-1">
          <XCircle className="tw-h-4 tw-w-4" aria-hidden="true" /> Web Push API not ready.
        </p>
      )}
    </div>
  );
};

const useRealtimeAlerts = (user: any, preferPushNotifications: boolean): UseRealtimeAlertsResult => {
  const [alertRealtimeStatus, setAlertRealtimeStatus] = useState<'active' | 'failed' | 'connecting'>('connecting');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setAlertRealtimeStatus('connecting');
        toast.info('Real-time alerts unsubscribed due to inactivity. Will resubscribe on new activity.', { duration: 3000 });
        AnalyticsService.trackEvent({ name: 'realtime_alerts_auto_unsubscribed_idle' });
      }
    }, IDLE_TIMEOUT_MS);
  }, []);

  const subscribeToAlerts = useCallback(() => {
    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setAlertRealtimeStatus('connecting');
      return;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    setAlertRealtimeStatus('connecting');
    channelRef.current = supabase
      .channel('public:alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        resetIdleTimer();
        if (!preferPushNotifications) {
          toast.info(`New Alert: ${payload.new.title}`, {
            description: payload.new.description,
            duration: 5000,
          });
        }
        AnalyticsService.trackEvent({ name: 'realtime_alert_received_in_app', properties: { alertId: payload.new.id, type: payload.new.type, toastShown: !preferPushNotifications } });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setAlertRealtimeStatus('active');
          toast.success('Real-time alerts connection active!', { id: 'alert-rt-status', duration: 3000 });
          AnalyticsService.trackEvent({ name: 'realtime_alerts_subscribed' });
          resetIdleTimer();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setAlertRealtimeStatus('failed');
          toast.error('Real-time alerts connection failed. Please refresh.', { id: 'alert-rt-status', duration: 5000 });
          AnalyticsService.trackEvent({ name: 'realtime_alerts_subscription_failed', properties: { status } });
        } else if (status === 'CLOSED' || status === 'UNSUBSCRIBED') {
          setAlertRealtimeStatus('failed');
          AnalyticsService.trackEvent({ name: 'realtime_alerts_unsubscribed_or_closed', properties: { status } });
        }
      });
  }, [user, preferPushNotifications, resetIdleTimer]);

  useEffect(() => {
    subscribeToAlerts();

    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      setAlertRealtimeStatus('connecting');
      AnalyticsService.trackEvent({ name: 'realtime_alerts_component_unmounted' });
    };
  }, [user, preferPushNotifications, subscribeToAlerts]);

  return { alertRealtimeStatus };
};