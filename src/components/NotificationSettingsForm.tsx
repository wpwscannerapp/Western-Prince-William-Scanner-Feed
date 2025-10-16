import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BellRing, MapPin, LocateFixed, CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { NotificationService } from '@/services/NotificationService';
import { handleError } from '@/utils/errorHandler';

const alertTypes = ['Fire', 'Police', 'Road Closure', 'Medical', 'Other'];
const radiusOptions = [1, 5, 10, 25, 50]; // Miles

const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  preferred_types: z.array(z.string()),
  radius_miles: z.number().min(1).max(100),
  manual_location_address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

interface NotificationSettingsFormProps {
  isWebPushInitialized: boolean;
}

const NotificationSettingsForm: React.FC<NotificationSettingsFormProps> = ({ isWebPushInitialized }) => {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const form = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      enabled: true,
      preferred_types: [],
      radius_miles: 5,
      manual_location_address: null,
      latitude: null,
      longitude: null,
    },
  });

  const { handleSubmit, reset, watch, setValue, getValues } = form;
  const enabled = watch('enabled');
  const preferredTypes = watch('preferred_types');

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const settings = await NotificationService.getUserNotificationSettings(user.id);
      if (settings) {
        reset(settings);
      } else {
        // If no settings exist, initialize with defaults and try to get location
        reset({
          enabled: true,
          preferred_types: [],
          radius_miles: 5,
          manual_location_address: null,
          latitude: null,
          longitude: null,
        });
        await getCurrentLocation(); // Try to get location on first load
      }
      // Check browser notification permission
      setNotificationPermission(Notification.permission);
    } catch (err) {
      handleError(err, 'Failed to load notification settings.');
    } finally {
      setIsLoading(false);
    }
  }, [user, reset]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings();
    }
  }, [user, authLoading, fetchSettings]);

  const onSubmit = async (values: NotificationSettingsFormValues) => {
    if (!user) {
      handleError(null, 'You must be logged in to save settings.');
      return;
    }
    if (!isWebPushInitialized) {
      handleError(null, 'Web Push API not initialized. Cannot save notification settings.');
      return;
    }

    setIsSaving(true);
    toast.loading('Saving notification settings...', { id: 'save-settings' });
    try {
      let updatedSettings = null;
      if (values.enabled) {
        // If enabling, ensure permission is granted and then subscribe
        if (notificationPermission !== 'granted') {
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);
          if (permission !== 'granted') {
            throw new Error('Notification permission not granted. Cannot enable push notifications.');
          }
        }
        const subscribed = await NotificationService.initWebPush(user.id); // This will subscribe if not already
        if (subscribed) {
          updatedSettings = await NotificationService.updateUserNotificationSettings(user.id, values);
        } else {
          throw new Error('Failed to subscribe to push notifications. Please check VAPID keys.');
        }
      } else {
        // If disabling, unsubscribe
        const unsubscribed = await NotificationService.unsubscribeWebPush(user.id);
        if (unsubscribed) {
          updatedSettings = await NotificationService.updateUserNotificationSettings(user.id, { ...values, push_subscription: null });
        } else {
          throw new Error('Failed to unsubscribe from push notifications.');
        }
      }

      if (updatedSettings) {
        toast.success('Settings saved successfully!', { id: 'save-settings' });
        setNotificationPermission(Notification.permission); // Update permission status
      } else {
        throw new Error('Failed to update settings in database.');
      }
    } catch (err) {
      handleError(err, 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleType = (type: string) => {
    const currentTypes = getValues('preferred_types');
    if (currentTypes.includes(type)) {
      setValue('preferred_types', currentTypes.filter((t: string) => t !== type));
    } else {
      setValue('preferred_types', [...currentTypes, type]);
    }
  };

  const getCurrentLocation = async () => {
    setIsLocating(true);
    toast.loading('Getting current location...', { id: 'get-location' });
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser.');
      }
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      });
      setValue('latitude', position.coords.latitude);
      setValue('longitude', position.coords.longitude);
      setValue('manual_location_address', null); // Clear manual address if geolocation is successful
      toast.success('Location updated!', { id: 'get-location' });
    } catch (err: any) {
      handleError(err, 'Failed to get current location. Please enable location services or enter manually.');
      setValue('latitude', null);
      setValue('longitude', null);
    } finally {
      setIsLocating(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      handleError(null, 'Notifications are not supported by your browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notification permission granted!');
        setValue('enabled', true); // Automatically enable if permission granted
        // No need to call initWebPush here, it will be called on form submit if enabled is true
      } else {
        toast.info('Notification permission denied or dismissed.');
        setValue('enabled', false);
        await NotificationService.unsubscribeWebPush(user!.id); // Unsubscribe if denied
      }
    } catch (err) {
      handleError(err, 'Failed to request notification permission.');
    }
  };

  const isFormDisabled = isSaving || isLocating || !isWebPushInitialized;

  if (authLoading || isLoading || !isWebPushInitialized) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary tw-mx-auto" />
          <p className="tw-mt-2 tw-text-muted-foreground">Loading notification settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <p className="tw-text-destructive">Please log in to manage your notification settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-xl tw-font-bold tw-text-foreground tw-flex tw-items-center tw-gap-2">
          <BellRing className="tw-h-6 tw-w-6 tw-text-primary" /> Notification Settings
        </CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Customize how you receive real-time emergency alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="tw-space-y-6">
          {!isWebPushInitialized && (
            <div className="tw-bg-yellow-100 tw-border-l-4 tw-border-yellow-500 tw-text-yellow-700 tw-p-4 tw-mb-4" role="alert">
              <p className="tw-font-bold">Web Push Not Ready</p>
              <p>Push notification features are temporarily unavailable. Please ensure your browser supports Service Workers and try again.</p>
            </div>
          )}
          <div className="tw-flex tw-items-center tw-justify-between">
            <Label htmlFor="enabled" className="tw-text-base">Enable Push Notifications</Label>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={async (checked) => {
                setValue('enabled', checked);
                if (checked && notificationPermission !== 'granted') {
                  await requestNotificationPermission();
                } else if (!checked && notificationPermission === 'granted') {
                  await NotificationService.unsubscribeWebPush(user.id);
                }
              }}
              disabled={isFormDisabled || notificationPermission === 'denied'}
            />
          </div>
          {notificationPermission === 'denied' && (
            <p className="tw-text-destructive tw-text-sm tw-flex tw-items-center tw-gap-1">
              <XCircle className="tw-h-4 tw-w-4" /> Notifications are blocked by your browser. Please enable them in your browser settings.
            </p>
          )}
          {notificationPermission === 'default' && enabled && (
            <p className="tw-text-yellow-600 tw-text-sm tw-flex tw-items-center tw-gap-1">
              <Info className="tw-h-4 tw-w-4" /> Browser permission pending. Click "Save Settings" to prompt for permission.
            </p>
          )}
          {notificationPermission === 'granted' && enabled && (
            <p className="tw-text-green-600 tw-text-sm tw-flex tw-items-center tw-gap-1">
              <CheckCircle2 className="tw-h-4 tw-w-4" /> Notifications are enabled and granted by your browser.
            </p>
          )}

          <div>
            <Label className="tw-mb-2 tw-block">Preferred Alert Types</Label>
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              {alertTypes.map(type => (
                <Button
                  key={type}
                  type="button"
                  variant={preferredTypes.includes(type) ? 'default' : 'outline'}
                  onClick={() => handleToggleType(type)}
                  disabled={isFormDisabled || !enabled}
                  className={preferredTypes.includes(type) ? 'tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground' : 'tw-text-muted-foreground hover:tw-text-primary'}
                >
                  {type}
                </Button>
              ))}
            </div>
            {form.formState.errors.preferred_types && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.preferred_types.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="radius_miles" className="tw-mb-2 tw-block">Alert Radius (miles)</Label>
            <Select
              value={watch('radius_miles').toString()}
              onValueChange={(value) => setValue('radius_miles', parseInt(value, 10))}
              disabled={isFormDisabled || !enabled}
            >
              <SelectTrigger id="radius_miles" className="tw-w-full">
                <SelectValue placeholder="Select radius" />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map(radius => (
                  <SelectItem key={radius} value={radius.toString()}>{radius} miles</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.radius_miles && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.radius_miles.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="manual_location_address" className="tw-mb-2 tw-block">Location for Alerts</Label>
            <div className="tw-flex tw-gap-2">
              <Input
                id="manual_location_address"
                placeholder="Enter address or zip code (e.g., 20155)"
                {...form.register('manual_location_address')}
                disabled={isFormDisabled || isLocating || !enabled}
                className="tw-flex-1"
              />
              <Button type="button" onClick={getCurrentLocation} disabled={isFormDisabled || isLocating || !enabled}>
                {isLocating ? <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" /> : <LocateFixed className="tw-mr-2 tw-h-4 tw-w-4" />}
                Use Current Location
              </Button>
            </div>
            {watch('latitude') && watch('longitude') && (
              <p className="tw-text-sm tw-text-muted-foreground tw-mt-1 tw-flex tw-items-center tw-gap-1">
                <MapPin className="tw-h-4 tw-w-4" /> Location set: {watch('latitude')?.toFixed(4)}, {watch('longitude')?.toFixed(4)}
              </p>
            )}
            {form.formState.errors.manual_location_address && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.manual_location_address.message}</p>
            )}
          </div>

          <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isFormDisabled}>
            {isSaving && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NotificationSettingsForm;