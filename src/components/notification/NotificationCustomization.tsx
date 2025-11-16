"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Info, Clock, CalendarDays } from 'lucide-react';
import { AnalyticsService } from '@/services/AnalyticsService';
import { daysOfWeek, NotificationSettingsFormValues } from './types';

interface NotificationCustomizationProps {
  isCustomizationDisabled: boolean;
}

export const NotificationCustomization: React.FC<NotificationCustomizationProps> = ({ isCustomizationDisabled }) => {
  const { watch, setValue, formState: { errors }, register } = useFormContext<NotificationSettingsFormValues>();
  const preferredDays = watch('preferred_days');

  const handleToggleDay = (day: string) => {
    const currentDays = watch('preferred_days');
    if (currentDays.includes(day)) {
      setValue('preferred_days', currentDays.filter((d: string) => d !== day));
      AnalyticsService.trackEvent({ name: 'notification_preferred_day_removed', properties: { day } });
    } else {
      setValue('preferred_days', [...currentDays, day]);
      AnalyticsService.trackEvent({ name: 'notification_preferred_day_added', properties: { day } });
    }
  };

  return (
    <div className="tw-space-y-4 tw-p-4 tw-border tw-rounded-md tw-bg-muted/20">
      <p className="tw-text-sm tw-text-muted-foreground tw-flex tw-items-center tw-gap-1">
        <Info className="tw-h-4 tw-w-4" aria-hidden="true" /> Customize when you want to receive alerts.
      </p>
      <div>
        <Label htmlFor="preferred_start_time" className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
          <Clock className="tw-h-4 tw-w-4" aria-hidden="true" /> Start Time (UTC)
        </Label>
        <Input
          id="preferred_start_time"
          type="time"
          {...register('preferred_start_time')}
          className="tw-bg-input tw-text-foreground"
          disabled={isCustomizationDisabled}
          aria-invalid={errors.preferred_start_time ? "true" : "false"}
          aria-describedby={errors.preferred_start_time ? "start-time-error" : undefined}
        />
        {errors.preferred_start_time && (
          <p id="start-time-error" className="tw-text-destructive tw-text-sm tw-mt-1">{errors.preferred_start_time.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="preferred_end_time" className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
          <Clock className="tw-h-4 tw-w-4" aria-hidden="true" /> End Time (UTC)
        </Label>
        <Input
          id="preferred_end_time"
          type="time"
          {...register('preferred_end_time')}
          className="tw-bg-input tw-text-foreground"
          disabled={isCustomizationDisabled}
          aria-invalid={errors.preferred_end_time ? "true" : "false"}
          aria-describedby={errors.preferred_end_time ? "end-time-error" : undefined}
        />
        {errors.preferred_end_time && (
          <p id="end-time-error" className="tw-text-destructive tw-text-sm tw-mt-1">{errors.preferred_end_time.message}</p>
        )}
      </div>
      <div>
        <Label className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
          <CalendarDays className="tw-h-4 tw-w-4" aria-hidden="true" /> Preferred Days
        </Label>
        <div className="tw-flex tw-flex-wrap tw-gap-2" role="group" aria-label="Preferred days for notifications">
          {daysOfWeek.map(day => (
            <Button
              key={day}
              type="button"
              variant={preferredDays.includes(day) ? 'default' : 'outline'}
              onClick={() => handleToggleDay(day)}
              disabled={isCustomizationDisabled}
              className={preferredDays.includes(day) ? 'tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground' : 'tw-text-muted-foreground hover:tw-text-primary'}
              aria-pressed={preferredDays.includes(day)}
              aria-label={`Toggle ${day} for notifications`}
            >
              {day}
            </Button>
          ))}
        </div>
        {errors.preferred_days && (
          <p className="tw-text-destructive tw-text-sm tw-mt-1">{errors.preferred_days.message}</p>
        )}
      </div>
    </div>
  );
};