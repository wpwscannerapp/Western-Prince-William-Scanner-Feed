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
import { geocodeAddress } from '@/utils/geocoding'; // Now imports the Google Maps version
import { toast } from 'sonner';
import { AnalyticsService } from '@/services/AnalyticsService';
import { IncidentRow } from '@/types/supabase';
import useDebounce from '@/hooks/useDebounce';
import { GOOGLE_MAPS_KEY } from '@/config';

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
  initialIncident?: Omit<IncidentRow, 'id' | 'created_at' | 'date' | 'title' | 'search_vector' | 'audio_url' | 'admin_id'>;
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
  
  // --- New Map State ---
  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  
  const locationWatch = form.watch('location');
  const debouncedLocation = useDebounce(locationWatch, 1000);
  // --- End New Map State ---

  // Effect to revoke object URLs when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (initialIncident) {
      form.reset({
        type: initialIncident.type,
        location: initialIncident.location,
        description: initialIncident.description,
        image: undefined,
      });
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(initialIncident.image_url || undefined);
      setImageFile(null);
      
      // Set initial coordinates if available for map preview
      if (initialIncident.latitude && initialIncident.longitude) {
        setGeocodedCoords({
          lat: initialIncident.latitude,
          lng: initialIncident.longitude,
        });
      } else {
        setGeocodedCoords(null);
      }
    } else {
      form.reset({
        type: '',
        location: '',
        description: '',
        image: undefined,
      });
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(undefined);
      setImageFile(null);
      setGeocodedCoords(null);
    }
  }, [initialIncident, form]);

  // --- Geocoding and Map Generation Effect ---
  useEffect(() => {
    if (!debouncedLocation.trim()) {
      setMapUrl(null);
      setGeocodedCoords(null);
      return;
    }

    let cancelled = false;
    setMapLoading(true);

    (async () => {
      const coords = await geocodeAddress(debouncedLocation);
      if (cancelled) return;

      if (coords) {
        const url = `https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lng}&zoom=15&size=600x300&markers=color:red%7C${coords.lat},${coords.lng}&key=${GOOGLE_MAPS_KEY}`;
        setMapUrl(url);
        setGeocodedCoords(coords);
      } else {
        setMapUrl(null);
        setGeocodedCoords(null);
      }
      setMapLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedLocation]);
  // --- End Geocoding and Map Generation Effect ---

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (import.meta.env.DEV) {
      console.log('IncidentForm: Image file selected:', file?.name, 'Size:', file?.size, 'Type:', file?.type);
    }
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
    // Use the coordinates from the real-time geocoding if available
    const latitude = geocodedCoords?.lat;
    const longitude = geocodedCoords?.lng;

    if (!latitude || !longitude) {
      toast.error('Location coordinates are missing. Please ensure the address is valid.');
      return;
    }

    const success = await onSubmit(
      values.type, 
      values.location, 
      values.description, 
      imageFile, 
      initialIncident?.image_url || null, 
      latitude, 
      longitude
    );
    
    if (success) {
      AnalyticsService.trackEvent({ 
        name: initialIncident ? 'incident_updated' : 'incident_created', 
        properties: { type: values.type, location: values.location, hasImage: !!imageFile || !!initialIncident?.image_url } 
      });
      if (!initialIncident) {
        form.reset();
        if (imagePreview && imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(undefined);
        setImageFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setGeocodedCoords(null);
        setMapUrl(null);
      }
    } else {
      AnalyticsService.trackEvent({ 
        name: initialIncident ? 'incident_update_failed' : 'incident_create_failed', 
        properties: { type: values.type, location: values.location, hasImage: !!imageFile || !!initialIncident?.image_url } 
      });
    }
  };

  const isFormDisabled = isLoading || mapLoading;

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
        
        {/* --- Static Map Preview JSX --- */}
        <div className="tw-mt-2">
          {mapLoading && <p className="tw-text-sm tw-text-muted-foreground">Generating map...</p>}

          {mapUrl && (
            <div className="tw-mt-4 tw-text-center">
              <img
                src={mapUrl}
                alt="Location map preview"
                className="tw-w-full tw-max-w-full tw-h-auto tw-rounded-lg tw-shadow-md tw-border tw-border-border"
              />
            </div>
          )}

          {!mapUrl && locationWatch && !mapLoading && (
            <p className="tw-text-destructive tw-text-sm tw-mt-1">
              Could not find that location. Try a more specific address.
            </p>
          )}
          
          {geocodedCoords && (
            <p className="tw-text-sm tw-text-muted-foreground tw-mt-1 tw-flex tw-items-center tw-gap-1">
              <MapPin className="tw-h-4 tw-w-4" aria-hidden="true" /> Coordinates: {geocodedCoords.lat.toFixed(4)}, {geocodedCoords.lng.toFixed(4)}
            </p>
          )}
        </div>
        {/* --- End Static Map Preview JSX --- */}
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
      {/* Only show the submit button if no formId is provided (i.e., when used standalone) */}
      {!formId && (
        <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isFormDisabled || !geocodedCoords}>
          {isFormDisabled && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
          <Send className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> {initialIncident ? 'Update Incident' : 'Submit Incident'}
        </Button>
      )}
      {!geocodedCoords && locationWatch && !mapLoading && (
        <p className="tw-text-sm tw-text-destructive tw-text-center">
          Please enter a valid location to enable submission.
        </p>
      )}
    </form>
  );
};

export default IncidentForm;