"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, XCircle, MapPin, Loader2, Send } from 'lucide-react';
import { geocodeAddress } from '@/utils/geocoding';
import { toast } from 'sonner';
import { AnalyticsService } from '@/services/AnalyticsService';
import { IncidentRow } from '@/types/supabase'; // Import IncidentRow

const incidentFormSchema = z.object({
  type: z.string().min(1, { message: 'Incident type is required.' }).max(100, { message: 'Incident type too long.' }),
  location: z.string().min(1, { message: 'Location is required.' }).max(200, { message: 'Location too long.' }),
  description: z.string().min(10, { message: 'Incident details must be at least 10 characters.' }).max(1000, { message: 'Description too long.' }),
  image: z.any().optional(),
});

type IncidentFormValues = z.infer<typeof incidentFormSchema>;

interface IncidentFormProps {
  onSubmit: (type: string, location: string, description: string, imageFile: File | null, currentImageUrl: string | null, latitude: number | undefined, longitude: number | undefined) => Promise<boolean>;
  isLoading: boolean;
  initialIncident?: Omit<IncidentRow, 'id' | 'created_at' | 'date' | 'title' | 'search_vector' | 'audio_url' | 'admin_id'>; // Use Omit with IncidentRow
  formId?: string;
}

const IncidentForm: React.FC<IncidentFormProps> = ({ onSubmit, isLoading, initialIncident, formId }) => {
  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      type: initialIncident?.type || '',
      location: initialIncident?.location || '',
      description: initialIncident?.description || '',
      image: undefined,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | undefined>(initialIncident?.image_url || undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [geocodedLocation, setGeocodedLocation] = useState<{ latitude: number; longitude: number; display_name: string } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Effect to revoke object URLs when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]); // Depend on imagePreview to revoke old URL when it changes

  useEffect(() => {
    if (initialIncident) {
      form.reset({
        type: initialIncident.type,
        location: initialIncident.location,
        description: initialIncident.description,
        image: undefined,
      });
      // Revoke old object URL if it exists and is a local one
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(initialIncident.image_url || undefined);
      setImageFile(null);
      if (initialIncident.latitude && initialIncident.longitude) {
        setGeocodedLocation({
          latitude: initialIncident.latitude,
          longitude: initialIncident.longitude,
          display_name: initialIncident.location,
        });
      } else {
        setGeocodedLocation(null);
      }
    } else {
      form.reset({
        type: '',
        location: '',
        description: '',
        image: undefined,
      });
      // Revoke old object URL if it exists and is a local one
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(undefined);
      setImageFile(null);
      setGeocodedLocation(null);
    }
  }, [initialIncident, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (import.meta.env.DEV) {
      console.log('IncidentForm: Image file selected:', file?.name, 'Size:', file?.size, 'Type:', file?.type);
    }
    // Revoke previous object URL if it exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(undefined);
    }
  };

  const handleRemoveImage = () => {
    if (import.meta.env.DEV) {
      console.log('IncidentForm: Removing image.');
    }
    // Revoke current object URL if it exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (values: IncidentFormValues) => {
    if (import.meta.env.DEV) {
      console.log('IncidentForm: handleSubmit triggered. Values:', values);
      console.log('IncidentForm: Current imageFile:', imageFile);
      console.log('IncidentForm: Current initialIncident?.image_url:', initialIncident?.image_url);
    }

    setIsGeocoding(true);
    let latitude: number | undefined = initialIncident?.latitude ?? undefined;
    let longitude: number | undefined = initialIncident?.longitude ?? undefined;

    if (values.location !== initialIncident?.location || (!initialIncident?.latitude && !initialIncident?.longitude)) {
      if (import.meta.env.DEV) {
        console.log('IncidentForm: Location changed or no initial coordinates. Attempting to geocode:', values.location);
      }
      const geoResult = await geocodeAddress(values.location);
      if (geoResult) {
        latitude = geoResult.latitude;
        longitude = geoResult.longitude;
        setGeocodedLocation(geoResult);
        toast.success('Location geocoded successfully!');
        AnalyticsService.trackEvent({ name: 'location_geocoded', properties: { address: values.location, success: true } });
      } else {
        toast.error('Failed to geocode location. Incident will be submitted without map coordinates.');
        latitude = undefined;
        longitude = undefined;
        setGeocodedLocation(null);
        AnalyticsService.trackEvent({ name: 'location_geocoded', properties: { address: values.location, success: false } });
      }
    } else if (initialIncident?.latitude && initialIncident?.longitude) {
      if (import.meta.env.DEV) {
        console.log('IncidentForm: Using existing geocoded location.');
      }
      setGeocodedLocation({
        latitude: initialIncident.latitude,
        longitude: initialIncident.longitude,
        display_name: initialIncident.location,
      });
    }
    setIsGeocoding(false);

    if (import.meta.env.DEV) {
      console.log('IncidentForm: Calling onSubmit prop with:', {
        type: values.type,
        location: values.location,
        description: values.description,
        imageFile: imageFile,
        currentImageUrl: initialIncident?.image_url,
        latitude: latitude,
        longitude: longitude,
      });
    }

    const success = await onSubmit(values.type, values.location, values.description, imageFile, initialIncident?.image_url || null, latitude, longitude);
    if (success) {
      AnalyticsService.trackEvent({ 
        name: initialIncident ? 'incident_updated' : 'incident_created', 
        properties: { type: values.type, location: values.location, hasImage: !!imageFile || !!initialIncident?.image_url } 
      });
      if (!initialIncident) {
        form.reset();
        // Revoke object URL after successful submission if it was a local one
        if (imagePreview && imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(undefined);
        setImageFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setGeocodedLocation(null);
      }
    } else {
      AnalyticsService.trackEvent({ 
        name: initialIncident ? 'incident_update_failed' : 'incident_create_failed', 
        properties: { type: values.type, location: values.location, hasImage: !!imageFile || !!initialIncident?.image_url } 
      });
    }
  };

  const isFormDisabled = isLoading || isGeocoding;

  return (
    <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="tw-space-y-6 tw-p-4 tw-border tw-rounded-lg tw-bg-card tw-shadow-sm">
      <div>
        <Label htmlFor="incident-type" className="tw-mb-2 tw-block">Incident Type</Label>
        <Input
          id="incident-type"
          placeholder="e.g., Structure Fire, Traffic Accident"
          {...form.register('type')}
          className="tw-bg-input tw-text-foreground"
          disabled={isFormDisabled}
          aria-invalid={form.formState.errors.type ? "true" : "false"}
          aria-describedby={form.formState.errors.type ? "incident-type-error" : undefined}
        />
        {form.formState.errors.type && (
          <p id="incident-type-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="incident-location" className="tw-mb-2 tw-block">Location</Label>
        <Input
          id="incident-location"
          placeholder="e.g., 123 Main St, Gainesville"
          {...form.register('location')}
          className="tw-bg-input tw-text-foreground"
          disabled={isFormDisabled}
          aria-invalid={form.formState.errors.location ? "true" : "false"}
          aria-describedby={form.formState.errors.location ? "incident-location-error" : undefined}
        />
        {form.formState.errors.location && (
          <p id="incident-location-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.location.message}</p>
        )}
        {geocodedLocation && (
          <p className="tw-text-sm tw-text-muted-foreground tw-mt-1 tw-flex tw-items-center tw-gap-1">
            <MapPin className="tw-h-4 tw-w-4" aria-hidden="true" /> Geocoded: {geocodedLocation.display_name} ({geocodedLocation.latitude.toFixed(4)}, {geocodedLocation.longitude.toFixed(4)})
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="incident-description" className="tw-mb-2 tw-block">Incident Details</Label>
        <Textarea
          id="incident-description"
          placeholder="Provide a detailed description of the incident..."
          {...form.register('description')}
          className="tw-min-h-[100px] tw-bg-input tw-text-foreground"
          disabled={isFormDisabled}
          aria-invalid={form.formState.errors.description ? "true" : "false"}
          aria-describedby={form.formState.errors.description ? "incident-description-error" : undefined}
        />
        {form.formState.errors.description && (
          <p id="incident-description-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="image-upload" className="tw-flex tw-items-center tw-gap-2 tw-cursor-pointer tw-mb-2 tw-block">
          <ImageIcon className="tw-h-4 tw-w-4" aria-hidden="true" /> Upload Image (Optional)
        </Label>
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="tw-block tw-w-full tw-text-sm tw-text-muted-foreground file:tw-mr-4 file:tw-py-2 file:tw-px-4 file:tw-rounded-full file:tw-border-0 file:tw-text-sm file:tw-font-semibold file:tw-bg-primary file:tw-text-primary-foreground hover:file:tw-bg-primary/90"
          disabled={isFormDisabled}
          ref={fileInputRef}
          aria-label="Upload incident image"
        />
        {imagePreview && (
          <div className="tw-relative tw-mt-4 tw-w-32 tw-h-32 tw-rounded-md tw-overflow-hidden">
            <img src={imagePreview} alt="Image preview" className="tw-w-full tw-h-full tw-object-cover" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="tw-absolute tw-top-1 tw-right-1 tw-h-6 tw-w-6 tw-rounded-full tw-bg-background/70 hover:tw-bg-background"
              onClick={handleRemoveImage}
              disabled={isFormDisabled}
            >
              <XCircle className="tw-h-4 tw-w-4 tw-text-destructive" aria-hidden="true" />
              <span className="tw-sr-only">Remove image</span>
            </Button>
          </div>
        )}
      </div>
      <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isFormDisabled}>
        {isFormDisabled && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
        <Send className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> {initialIncident ? 'Update Incident' : 'Submit Incident'}
      </Button>
    </form>
  );
};

export default IncidentForm;