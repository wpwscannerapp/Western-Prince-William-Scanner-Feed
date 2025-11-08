"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Loader2, Send } from 'lucide-react';
import { geocodeAddress } from '@/utils/geocoding';
import { toast } from 'sonner';
import { AlertRow } from '@/types/supabase'; // Import AlertRow
import { AnalyticsService } from '@/services/AnalyticsService';
import useDebounce from '@/hooks/useDebounce'; // Import useDebounce

const alertFormSchema = z.object({
  title: z.string().min(1, { message: 'Alert title is required.' }).max(100, { message: 'Title too long.' }),
  description: z.string().min(10, { message: 'Alert description must be at least 10 characters.' }).max(500, { message: 'Description too long.' }),
  type: z.string().min(1, { message: 'Alert type is required.' }).max(50, { message: 'Type too long.' }),
  location_text: z.string().min(1, { message: 'Location is required for geocoding.' }).max(200, { message: 'Location text too long.' }),
});

type AlertFormValues = z.infer<typeof alertFormSchema>;

interface AlertFormProps {
  onSubmit: (alert: Omit<AlertRow, 'id' | 'created_at'>) => Promise<boolean>; // Use AlertRow
  isLoading: boolean;
  initialAlert?: Omit<AlertRow, 'created_at'>; // Use AlertRow
  formId?: string;
}

const AlertForm: React.FC<AlertFormProps> = ({ onSubmit, isLoading, initialAlert, formId }) => {
  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      title: initialAlert?.title || '',
      description: initialAlert?.description || '',
      type: initialAlert?.type || '',
      location_text: '', // This will be populated if initialAlert has lat/lon
    },
  });

  const [geocodedLocation, setGeocodedLocation] = useState<{ latitude: number; longitude: number; display_name: string } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const locationWatch = form.watch('location_text');
  const debouncedLocation = useDebounce(locationWatch, 1000); // Debounce location input for 1 second

  // --- Geocoding Effect ---
  useEffect(() => {
    if (initialAlert && !locationWatch) {
        // Skip geocoding if editing and location is empty (handled by initialAlert check)
        return;
    }
    if (!debouncedLocation.trim()) {
      setGeocodedLocation(null);
      return;
    }

    let cancelled = false;
    setIsGeocoding(true);

    (async () => {
      const geoResult = await geocodeAddress(debouncedLocation);
      if (cancelled) return;

      if (geoResult) {
        setGeocodedLocation({
          latitude: geoResult.lat,
          longitude: geoResult.lng,
          display_name: debouncedLocation,
        });
        // Only show success toast if it's a new geocoding result, not on initial load
        if (initialAlert?.latitude !== geoResult.lat || initialAlert?.longitude !== geoResult.lng) {
            toast.success('Location geocoded successfully!');
        }
        AnalyticsService.trackEvent({ name: 'alert_location_geocoded', properties: { address: debouncedLocation, success: true } });
      } else {
        setGeocodedLocation(null);
        AnalyticsService.trackEvent({ name: 'alert_location_geocoded', properties: { address: debouncedLocation, success: false } });
      }
      setIsGeocoding(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedLocation, initialAlert]);
  // --- End Geocoding Effect ---

  useEffect(() => {
    if (initialAlert) {
      form.reset({
        title: initialAlert.title,
        description: initialAlert.description,
        type: initialAlert.type,
        // For editing, we set location_text to a placeholder if coordinates exist
        location_text: initialAlert.latitude && initialAlert.longitude ? `Lat: ${initialAlert.latitude.toFixed(4)}, Lon: ${initialAlert.longitude.toFixed(4)}` : '',
      });
      if (initialAlert.latitude && initialAlert.longitude) {
        setGeocodedLocation({
          latitude: initialAlert.latitude,
          longitude: initialAlert.longitude,
          display_name: `Lat: ${initialAlert.latitude.toFixed(4)}, Lon: ${initialAlert.longitude.toFixed(4)}`, // Placeholder
        });
      } else {
        setGeocodedLocation(null);
      }
    } else {
      form.reset({
        title: '',
        description: '',
        type: '',
        location_text: '',
      });
      setGeocodedLocation(null);
    }
  }, [initialAlert, form]);

  const handleSubmit = async (values: AlertFormValues) => {
    if (!geocodedLocation) {
      toast.error('Please wait for geocoding to complete or enter a valid location.');
      return false;
    }

    const latitude = geocodedLocation.latitude;
    const longitude = geocodedLocation.longitude;

    const success = await onSubmit({
      title: values.title,
      description: values.description,
      type: values.type,
      latitude: latitude,
      longitude: longitude,
    });

    if (success) {
      AnalyticsService.trackEvent({ 
        name: initialAlert ? 'alert_updated' : 'alert_created', 
        properties: { type: values.type, title: values.title, latitude, longitude } 
      });
      if (!initialAlert) {
        form.reset();
        setGeocodedLocation(null);
      }
    } else {
      AnalyticsService.trackEvent({ 
        name: initialAlert ? 'alert_update_failed' : 'alert_create_failed', 
        properties: { type: values.type, title: values.title, latitude, longitude } 
      });
    }
    return success;
  };

  const isFormDisabled = isLoading || isGeocoding;

  return (
    <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="tw-space-y-6 tw-p-4 tw-border tw-rounded-lg tw-bg-card tw-shadow-sm">
      <div>
        <Label htmlFor="alert-title" className="tw-mb-2 tw-block">Alert Title</Label>
        <Input
          id="alert-title"
          placeholder="e.g., New Structure Fire"
          {...form.register('title')}
          className="tw-bg-input tw-text-foreground"
          disabled={isFormDisabled}
          aria-invalid={form.formState.errors.title ? "true" : "false"}
          aria-describedby={form.formState.errors.title ? "alert-title-error" : undefined}
        />
        {form.formState.errors.title && (
          <p id="alert-title-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="alert-description" className="tw-mb-2 tw-block">Alert Description</Label>
        <Textarea
          id="alert-description"
          placeholder="Provide a detailed description of the alert..."
          {...form.register('description')}
          className="tw-min-h-[100px] tw-bg-input tw-text-foreground"
          disabled={isFormDisabled}
          aria-invalid={form.formState.errors.description ? "true" : "false"}
          aria-describedby={form.formState.errors.description ? "alert-description-error" : undefined}
        />
        {form.formState.errors.description && (
          <p id="alert-description-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="alert-type" className="tw-mb-2 tw-block">Alert Type</Label>
        <Input
          id="alert-type"
          placeholder="e.g., Fire, Police, Medical"
          {...form.register('type')}
          className="tw-bg-input tw-text-foreground"
          disabled={isFormDisabled}
          aria-invalid={form.formState.errors.type ? "true" : "false"}
          aria-describedby={form.formState.errors.type ? "alert-type-error" : undefined}
        />
        {form.formState.errors.type && (
          <p id="alert-type-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="alert-location-text" className="tw-mb-2 tw-block">Location (for Geocoding)</Label>
        <Input
          id="alert-location-text"
          placeholder="e.g., 123 Main St, Gainesville, VA"
          {...form.register('location_text')}
          className="tw-bg-input tw-text-foreground"
          disabled={isFormDisabled}
          aria-invalid={form.formState.errors.location_text ? "true" : "false"}
          aria-describedby={form.formState.errors.location_text ? "alert-location-text-error" : undefined}
        />
        {form.formState.errors.location_text && (
          <p id="alert-location-text-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.location_text.message}</p>
        )}
        {geocodedLocation && (
          <p className="tw-text-sm tw-text-muted-foreground tw-mt-1 tw-flex tw-items-center tw-gap-1">
            <MapPin className="tw-h-4 tw-w-4" aria-hidden="true" /> Geocoded: {geocodedLocation.display_name} ({geocodedLocation.latitude.toFixed(4)}, {geocodedLocation.longitude.toFixed(4)})
          </p>
        )}
      </div>

      <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isFormDisabled || !geocodedLocation}>
        {isFormDisabled && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
        <Send className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> {initialAlert ? 'Update Alert' : 'Create Alert'}
      </Button>
      {!geocodedLocation && locationWatch && !isGeocoding && (
        <p className="tw-text-sm tw-text-destructive tw-text-center">
          Please enter a valid location to enable submission.
        </p>
      )}
    </form>
  );
};

export default AlertForm;