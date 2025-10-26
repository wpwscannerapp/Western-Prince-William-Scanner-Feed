import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, XCircle, MapPin } from 'lucide-react'; // Removed Loader2
import { geocodeAddress } from '@/utils/geocoding';
import { toast } from 'sonner';

const incidentFormSchema = z.object({
  type: z.string().min(1, { message: 'Incident type is required.' }).max(100, { message: 'Incident type too long.' }),
  location: z.string().min(1, { message: 'Location is required.' }).max(200, { message: 'Location too long.' }),
  description: z.string().min(10, { message: 'Incident details must be at least 10 characters.' }).max(1000, { message: 'Description too long.' }),
  image: z.any().optional(),
});

type IncidentFormValues = z.infer<typeof incidentFormSchema>;

interface IncidentFormProps {
  onSubmit: (type: string, location: string, description: string, imageFile: File | null, currentImageUrl: string | undefined, latitude: number | undefined, longitude: number | undefined) => Promise<boolean>;
  isLoading: boolean;
  initialIncident?: {
    type: string;
    location: string;
    description: string;
    image_url?: string;
    latitude?: number;
    longitude?: number;
  };
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

  useEffect(() => {
    if (initialIncident) {
      form.reset({
        type: initialIncident.type,
        location: initialIncident.location,
        description: initialIncident.description,
        image: undefined,
      });
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
      setImagePreview(undefined);
      setImageFile(null);
      setGeocodedLocation(null);
    }
  }, [initialIncident, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(undefined);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (values: IncidentFormValues) => {
    setIsGeocoding(true);
    let latitude: number | undefined = initialIncident?.latitude;
    let longitude: number | undefined = initialIncident?.longitude;

    if (values.location !== initialIncident?.location || (!initialIncident?.latitude && !initialIncident?.longitude)) {
      const geoResult = await geocodeAddress(values.location);
      if (geoResult) {
        latitude = geoResult.latitude;
        longitude = geoResult.longitude;
        setGeocodedLocation(geoResult);
        toast.success('Location geocoded successfully!');
      } else {
        toast.error('Failed to geocode location. Incident will be submitted without map coordinates.');
        latitude = undefined;
        longitude = undefined;
        setGeocodedLocation(null);
      }
    } else if (initialIncident?.latitude && initialIncident?.longitude) {
      setGeocodedLocation({
        latitude: initialIncident.latitude,
        longitude: initialIncident.longitude,
        display_name: initialIncident.location,
      });
    }
    setIsGeocoding(false);

    const success = await onSubmit(values.type, values.location, values.description, imageFile, initialIncident?.image_url, latitude, longitude);
    if (success && !initialIncident) {
      form.reset();
      setImagePreview(undefined);
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setGeocodedLocation(null);
    }
  };

  return (
    <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="tw-space-y-6 tw-p-4 tw-border tw-rounded-lg tw-bg-card tw-shadow-sm">
      <div>
        <Label htmlFor="incident-type" className="tw-mb-2 tw-block">Incident Type</Label>
        <Input
          id="incident-type"
          placeholder="e.g., Structure Fire, Traffic Accident"
          {...form.register('type')}
          className="tw-bg-input tw-text-foreground"
          disabled={isLoading || isGeocoding}
        />
        {form.formState.errors.type && (
          <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="incident-location" className="tw-mb-2 tw-block">Location</Label>
        <Input
          id="incident-location"
          placeholder="e.g., 123 Main St, Gainesville"
          {...form.register('location')}
          className="tw-bg-input tw-text-foreground"
          disabled={isLoading || isGeocoding}
        />
        {form.formState.errors.location && (
          <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.location.message}</p>
        )}
        {geocodedLocation && (
          <p className="tw-text-sm tw-text-muted-foreground tw-mt-1 tw-flex tw-items-center tw-gap-1">
            <MapPin className="tw-h-4 tw-w-4" /> Geocoded: {geocodedLocation.display_name} ({geocodedLocation.latitude.toFixed(4)}, {geocodedLocation.longitude.toFixed(4)})
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
          disabled={isLoading || isGeocoding}
        />
        {form.formState.errors.description && (
          <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="image-upload" className="tw-flex tw-items-center tw-gap-2 tw-cursor-pointer tw-mb-2 tw-block">
          <ImageIcon className="tw-h-4 tw-w-4" /> Upload Image (Optional)
        </Label>
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="tw-block tw-w-full tw-text-sm tw-text-muted-foreground file:tw-mr-4 file:tw-py-2 file:tw-px-4 file:tw-rounded-full file:tw-border-0 file:tw-text-sm file:tw-font-semibold file:tw-bg-primary file:tw-text-primary-foreground hover:file:tw-bg-primary/90"
          disabled={isLoading || isGeocoding}
          ref={fileInputRef}
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
              disabled={isLoading || isGeocoding}
            >
              <XCircle className="tw-h-4 tw-w-4 tw-text-destructive" />
              <span className="tw-sr-only">Remove image</span>
            </Button>
          </div>
        )}
      </div>
    </form>
  );
};

export default IncidentForm;