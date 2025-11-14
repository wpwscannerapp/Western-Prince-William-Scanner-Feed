"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button'; // Import Button
import { CardDescription } from '@/components/ui/card';
import { NotificationSettingsFormValues } from './types';

// --- Component ---

interface AllAlertsToggleProps {
  isFormDisabled: boolean;
}

export const AllAlertsToggle: React.FC<AllAlertsToggleProps> = ({ isFormDisabled }) => {
  const { watch, setValue } = useFormContext<NotificationSettingsFormValues>();
  const receiveAllAlerts = watch('receive_all_alerts');
  const enabled = watch('enabled');

  const handleReceiveAllAlerts = (checked: boolean) => {
    setValue('receive_all_alerts', checked);
    if (checked) {
      setValue('preferred_start_time', '');
      setValue('preferred_end_time', '');
      setValue('preferred_days', []);
    }
  };

  return (
    <div className="tw-space-y-2">
      <div className="tw-flex tw-items-center tw-justify-between">
        <Label htmlFor="receive_all_alerts" className="tw-text-base">Get All Alerts (24/7)</Label>
        <div className="tw-flex tw-gap-2">
          <Button
            variant={receiveAllAlerts ? 'default' : 'outline'}
            onClick={() => handleReceiveAllAlerts(true)}
            disabled={isFormDisabled || !enabled}
            aria-pressed={receiveAllAlerts}
            aria-label="Receive all alerts 24/7"
            className={receiveAllAlerts ? 'tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground' : 'tw-text-muted-foreground hover:tw-text-primary'}
          >
            On
          </Button>
          <Button
            variant={!receiveAllAlerts ? 'default' : 'outline'}
            onClick={() => handleReceiveAllAlerts(false)}
            disabled={isFormDisabled || !enabled}
            aria-pressed={!receiveAllAlerts}
            aria-label="Customize alert times"
            className={!receiveAllAlerts ? 'tw-bg-destructive hover:tw-bg-destructive/90 tw-text-destructive-foreground' : 'tw-text-muted-foreground hover:tw-text-destructive'}
          >
            Off
          </Button>
        </div>
      </div>
      <CardDescription className="tw-text-muted-foreground">
        Turn this off to set custom times and days for when you want to receive alerts.
      </CardDescription>
    </div>
  );
};