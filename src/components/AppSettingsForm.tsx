"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { ChromePicker } from 'react-color';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, RotateCcw, Eye } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { LayoutComponent } from './LayoutEditor'; // Added import for LayoutComponent
import { SettingsService, AppSettings } from '@/services/SettingsService';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

// Lazy load LayoutEditor
const LazyLayoutEditor = React.lazy(() => import('./LayoutEditor'));

const settingsSchema = z.object({
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  font_family: z.string().min(1, 'Font family is required'),
  logo_url: z.string().url().optional().or(z.literal('')).nullable(),
  favicon_url: z.string().url().optional().or(z.literal('')).nullable(),
  custom_css: z.string().optional().nullable(),
  layout: z.array(z.object({ id: z.string(), type: z.string(), content: z.string() })).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const AppSettingsForm: React.FC = () => {
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [versionHistory, setVersionHistory] = useState<
    Array<{ id: string; created_at: string; settings: AppSettings; layout?: AppSettings['layout'] }>
  >([]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      primary_color: '#2196F3',
      secondary_color: '#4CAF50',
      font_family: 'Inter',
      logo_url: '',
      favicon_url: '',
      custom_css: '',
      layout: [],
    },
  });

  const fetchSettingsAndHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSettings = await SettingsService.getSettings();
      if (currentSettings) {
        const formValues: SettingsFormValues = {
          primary_color: currentSettings.primary_color,
          secondary_color: currentSettings.secondary_color,
          font_family: currentSettings.font_family,
          logo_url: currentSettings.logo_url || '',
          favicon_url: currentSettings.favicon_url || '',
          custom_css: currentSettings.custom_css || '',
          layout: currentSettings.layout || [],
        };
        form.reset(formValues);
      }

      const history = await SettingsService.fetchSettingsHistory();
      setVersionHistory(history || []);
      AnalyticsService.trackEvent({ name: 'app_settings_form_loaded', properties: { historyCount: history?.length || 0 } });
    } catch (err) {
      handleError(err, 'Failed to load app settings or history.');
      AnalyticsService.trackEvent({ name: 'app_settings_form_load_failed', properties: { error: (err as Error).message } });
    } finally {
      setIsLoading(false);
    }
  }, [form]);

  useEffect(() => {
    if (!isAdminLoading) {
      fetchSettingsAndHistory();
    }
  }, [isAdminLoading, fetchSettingsAndHistory]);

  if (isAdminLoading || isLoading) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary tw-mx-auto" aria-label="Loading application settings" />
          <p className="tw-mt-2 tw-text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <p className="tw-text-destructive">Access denied. Only Administrators can modify settings.</p>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (values: SettingsFormValues) => {
    setIsSaving(true);
    try {
      toast.loading('Saving settings...', { id: 'save-settings' });
      const success = await SettingsService.updateSettings(values);
      if (!success) throw new Error('Failed to update settings in database.');

      const settingsForHistory: AppSettings = {
        id: 'new-history-entry',
        ...values,
        logo_url: values.logo_url || null,
        favicon_url: values.favicon_url || null,
        custom_css: values.custom_css || null,
        layout: values.layout || [],
        updated_at: new Date().toISOString(),
      };

      const historySuccess = await SettingsService.insertSettingsHistory(settingsForHistory);
      if (!historySuccess) console.warn('Failed to save settings to history.');

      toast.success('Settings saved successfully!', { id: 'save-settings' });
      AnalyticsService.trackEvent({ name: 'app_settings_saved', properties: { primaryColor: values.primary_color, fontFamily: values.font_family } });
      fetchSettingsAndHistory();
    } catch (err) {
      handleError(err, 'Failed to save settings.');
      AnalyticsService.trackEvent({ name: 'app_settings_save_failed', properties: { error: (err as Error).message } });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async (historyId: string) => {
    setIsSaving(true);
    try {
      toast.loading('Reverting settings...', { id: 'revert-settings' });
      const historyEntry = await SettingsService.getSettingsFromHistory(historyId);
      if (!historyEntry) throw new Error('History entry not found.');

      const success = await SettingsService.updateSettings(historyEntry.settings);
      if (!success) throw new Error('Failed to revert settings in database.');

      const formValues: SettingsFormValues = {
        primary_color: historyEntry.settings.primary_color,
        secondary_color: historyEntry.settings.secondary_color,
        font_family: historyEntry.settings.font_family,
        logo_url: historyEntry.settings.logo_url || '',
        favicon_url: historyEntry.settings.favicon_url || '',
        custom_css: historyEntry.settings.custom_css || '',
        layout: historyEntry.settings.layout || [],
      };
      form.reset(formValues);
      toast.success('Reverted to previous settings!', { id: 'revert-settings' });
      AnalyticsService.trackEvent({ name: 'app_settings_reverted', properties: { historyId } });
      fetchSettingsAndHistory();
    } catch (err) {
      handleError(err, 'Failed to revert settings.');
      AnalyticsService.trackEvent({ name: 'app_settings_revert_failed', properties: { historyId, error: (err as Error).message } });
    } finally {
      setIsSaving(false);
    }
  };

  const watchLayout = form.watch('layout');
  // Ensure logoUrl is not an empty string before passing to Netlify Image CDN
  const logoUrlForCDN = (form.watch('logo_url') || '').trim() !== '' ? form.watch('logo_url') : undefined;


  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-xl tw-font-bold tw-text-foreground">Application Settings</CardTitle>
        <CardDescription className="tw-text-muted-foreground">Customize the look and feel and layout of your application.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="theme">
          <TabsList className="tw-grid tw-w-full tw-grid-cols-5">
            <TabsTrigger value="theme" aria-label="Theme settings tab">Theme</TabsTrigger>
            <TabsTrigger value="branding" aria-label="Branding settings tab">Branding</TabsTrigger>
            <TabsTrigger value="custom" aria-label="Custom CSS tab">Custom CSS</TabsTrigger>
            <TabsTrigger value="layout" aria-label="Layout editor tab">Layout</TabsTrigger>
            <TabsTrigger value="history" aria-label="Version history tab">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="theme" className="tw-space-y-6 tw-mt-4">
            <div>
              <Label htmlFor="primaryColor" className="tw-mb-2 tw-block">Primary Color</Label>
              <ChromePicker
                color={form.watch('primary_color')}
                onChange={(color: { hex: string }) => form.setValue('primary_color', color.hex)}
                disableAlpha
                className="tw-mt-2"
                aria-label="Primary color picker"
              />
              {form.formState.errors.primary_color && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.primary_color.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="secondaryColor" className="tw-mb-2 tw-block">Secondary Color</Label>
              <ChromePicker
                color={form.watch('secondary_color')}
                onChange={(color: { hex: string }) => form.setValue('secondary_color', color.hex)}
                disableAlpha
                className="tw-mt-2"
                aria-label="Secondary color picker"
              />
              {form.formState.errors.secondary_color && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.secondary_color.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="fontFamily" className="tw-mb-2 tw-block">Font Family</Label>
              <Input
                id="fontFamily"
                placeholder="e.g., Inter, sans-serif"
                {...form.register('font_family')}
                className="tw-bg-input tw-text-foreground"
                aria-invalid={form.formState.errors.font_family ? "true" : "false"}
                aria-describedby={form.formState.errors.font_family ? "font-family-error" : undefined}
              />
              {form.formState.errors.font_family && (
                <p id="font-family-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.font_family.message}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="branding" className="tw-space-y-6 tw-mt-4">
            <div>
              <Label htmlFor="logoUrl" className="tw-mb-2 tw-block">Logo URL</Label>
              <Input
                id="logoUrl"
                placeholder="https://example.com/logo.png"
                {...form.register('logo_url')}
                className="tw-bg-input tw-text-foreground"
                aria-invalid={form.formState.errors.logo_url ? "true" : "false"}
                aria-describedby={form.formState.errors.logo_url ? "logo-url-error" : undefined}
              />
              {form.formState.errors.logo_url && (
                <p id="logo-url-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.logo_url.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="faviconUrl" className="tw-mb-2 tw-block">Favicon URL</Label>
              <Input
                id="faviconUrl"
                placeholder="https://example.com/favicon.ico"
                {...form.register('favicon_url')}
                className="tw-bg-input tw-text-foreground"
                aria-invalid={form.formState.errors.favicon_url ? "true" : "false"}
                aria-describedby={form.formState.errors.favicon_url ? "favicon-url-error" : undefined}
              />
              {form.formState.errors.favicon_url && (
                <p id="favicon-url-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.favicon_url.message}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="tw-space-y-6 tw-mt-4">
            <div>
              <Label htmlFor="customCss" className="tw-mb-2 tw-block">Custom CSS</Label>
              <Textarea
                id="customCss"
                placeholder="body { background-color: #f0f0f0; }"
                {...form.register('custom_css')}
                className="tw-min-h-[150px] tw-bg-input tw-text-foreground"
                aria-invalid={form.formState.errors.custom_css ? "true" : "false"}
                aria-describedby={form.formState.errors.custom_css ? "custom-css-error" : undefined}
              />
              {form.formState.errors.custom_css && (
                <p id="custom-css-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.custom_css.message}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="layout" className="tw-space-y-6 tw-mt-4">
            <Suspense fallback={<div className="tw-min-h-[300px] tw-flex tw-items-center tw-justify-center tw-bg-muted/20 tw-rounded-lg"><Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading layout editor" /></div>}>
              <LazyLayoutEditor layout={watchLayout || []} onLayoutChange={(newLayout) => form.setValue('layout', newLayout as LayoutComponent[])} />
            </Suspense>
            {form.formState.errors.layout && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.layout.message}</p>
            )}
          </TabsContent>

          <TabsContent value="history" className="tw-space-y-4 tw-mt-4">
            {versionHistory.length === 0 ? (
              <p className="tw-text-muted-foreground">No version history available.</p>
            ) : (
              <div className="tw-space-y-2" role="list" aria-label="Settings version history">
                {versionHistory.map((entry) => (
                  <div key={entry.id} className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-px-3 tw-bg-muted/30 tw-rounded-md tw-border tw-border-border" role="listitem">
                    <span className="tw-text-sm tw-text-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                    <Button onClick={() => handleRevert(entry.id)} variant="outline" size="sm" disabled={isSaving} aria-label={`Revert to settings from ${new Date(entry.created_at).toLocaleString()}`}>
                      <RotateCcw className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Revert
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <Button onClick={() => setPreviewOpen(true)} variant="outline" disabled={isSaving} aria-label="Preview changes">
            <Eye className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Preview Changes
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} aria-label="Save settings">
            {isSaving && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
      
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:tw-max-w-[800px] tw-max-h-[90vh] tw-flex tw-flex-col">
          <DialogHeader>
            <DialogTitle>Preview Appearance</DialogTitle>
          </DialogHeader>
          <div className="tw-flex-1 tw-overflow-auto tw-p-4 tw-border tw-rounded-md tw-bg-background" style={{ fontFamily: form.watch('font_family') }}>
            <h3 className="tw-text-lg tw-font-semibold tw-mb-2">Layout Preview</h3>
            <div className="tw-space-y-2 tw-border tw-border-dashed tw-p-2 tw-rounded-md">
              {watchLayout?.length === 0 ? (
                <p className="tw-text-muted-foreground tw-text-center">No components in layout.</p>
              ) : (
                watchLayout?.map((comp) => (
                  <div key={comp.id} className="tw-p-3 tw-rounded-md tw-bg-primary tw-text-primary-foreground tw-text-sm">
                    {comp.content}
                  </div>
                ))
              )}
            </div>
            <h3 className="tw-lg tw-font-semibold tw-mt-4 tw-mb-2">Color & Font Preview</h3>
            <div className="tw-space-y-2">
              <p className="tw-text-foreground">This text uses the selected font family.</p>
              <div className="tw-flex tw-items-center tw-gap-2">
                <span className="tw-text-sm">Primary Color:</span>
                <div className="tw-h-6 tw-w-6 tw-rounded-full tw-border" style={{ backgroundColor: form.watch('primary_color') }}></div>
                <span className="tw-text-sm tw-text-muted-foreground">{form.watch('primary_color')}</span>
              </div>
              <div className="tw-flex tw-items-center tw-gap-2">
                <span className="tw-sm">Secondary Color:</span>
                <div className="tw-h-6 tw-w-6 tw-rounded-full tw-border" style={{ backgroundColor: form.watch('secondary_color') }}></div>
                <span className="tw-sm tw-text-muted-foreground">{form.watch('secondary_color')}</span>
              </div>
            </div>
            {logoUrlForCDN && (
              <div className="tw-mt-4">
                <h3 className="tw-lg tw-font-semibold tw-mb-2">Logo Preview</h3>
                <img 
                  src={`/.netlify/images?url=${encodeURIComponent(logoUrlForCDN)}&w=200&h=80&fit=contain&fm=auto`} 
                  alt="Logo Preview" 
                  className="tw-max-h-20 tw-max-w-full tw-object-contain" 
                />
              </div>
            )}
            {form.watch('custom_css') && (
              <div className="tw-mt-4">
                <h3 className="tw-lg tw-font-semibold tw-mb-2">Custom CSS Applied</h3>
                <p className="tw-text-sm tw-text-muted-foreground">Custom CSS is active in this preview.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AppSettingsForm;