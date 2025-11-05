"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

  return (
    <div className="tw-space-y-2">
      <div className="tw-flex tw-items-center tw-justify-between">
        <Label htmlFor="receive_all_alerts" className="tw-text-base">Get All Alerts (24/7)</Label>
        <Switch
          id="receive_all_alerts"
          checked={receiveAllAlerts}
          onCheckedChange={(checked) => {
            setValue('receive_all_alerts', checked);
            if (checked) {
              setValue('preferred_start_time', '');
              setValue('preferred_end_time', '');
              setValue('preferred_days', []);
            }
          }}
          disabled={isFormDisabled || !enabled}
          aria-label="Toggle receiving all alerts 24/7"
        />
      </div>
      <CardDescription className="tw-text-muted-foreground">
        Turn this off to set custom times and days for when you want to receive alerts.
      </CardDescription>
    </div>
  );
};