import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input'; // Import Input for color picker
import { Button } from '@/components/ui/button'; // Import Button
import { Loader2 } from 'lucide-react'; // Import Loader2
import { useTheme } from '@/hooks/useTheme';
import { useAppSettings } from '@/hooks/useAppSettings'; // Import useAppSettings
import { SettingsService } from '@/services/SettingsService'; // Import SettingsService
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';

const AppSettingsForm: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { primaryColor, isLoadingPrimaryColor } = useAppSettings(); // Get primary color from hook
  const [currentPrimaryColor, setCurrentPrimaryColor] = useState<string>('#2196F3'); // Default blue
  const [isSavingColor, setIsSavingColor] = useState(false);

  useEffect(() => {
    if (primaryColor) {
      setCurrentPrimaryColor(primaryColor);
    }
  }, [primaryColor]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPrimaryColor(e.target.value);
  };

  const handleSavePrimaryColor = async () => {
    setIsSavingColor(true);
    toast.loading('Saving primary color...', { id: 'save-color' });
    try {
      const success = await SettingsService.updateSetting('primary_color', currentPrimaryColor);
      if (success) {
        toast.success('Primary color updated!', { id: 'save-color' });
      } else {
        handleError(null, 'Failed to save primary color.', { id: 'save-color' });
      }
    } catch (err) {
      handleError(err, 'An unexpected error occurred while saving color.', { id: 'save-color' });
    } finally {
      setIsSavingColor(false);
    }
  };

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-text-xl tw-font-bold tw-text-foreground">Appearance Settings</CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Customize the look and feel of the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="tw-space-y-6">
        <div className="tw-flex tw-items-center tw-justify-between tw-space-x-2">
          <Label htmlFor="dark-mode-toggle" className="tw-flex tw-flex-col tw-space-y-1">
            <span className="tw-text-base tw-font-medium tw-leading-none">Dark Mode</span>
            <span className="tw-text-sm tw-text-muted-foreground">
              Enable dark theme for a more comfortable viewing experience.
            </span>
          </Label>
          <Switch
            id="dark-mode-toggle"
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
          />
        </div>

        <div className="tw-space-y-2">
          <Label htmlFor="primary-color-picker" className="tw-flex tw-flex-col tw-space-y-1">
            <span className="tw-text-base tw-font-medium tw-leading-none">Primary Color</span>
            <span className="tw-text-sm tw-text-muted-foreground">
              Choose the main accent color for your application.
            </span>
          </Label>
          <div className="tw-flex tw-items-center tw-gap-2">
            <Input
              id="primary-color-picker"
              type="color"
              value={currentPrimaryColor}
              onChange={handleColorChange}
              className="tw-h-10 tw-w-10 tw-p-0 tw-border-none tw-cursor-pointer [&::-webkit-color-swatch]:tw-rounded-md [&::-webkit-color-swatch-wrapper]:tw-p-0"
              disabled={isLoadingPrimaryColor || isSavingColor}
            />
            <Input
              type="text"
              value={currentPrimaryColor}
              onChange={handleColorChange}
              className="tw-flex-1 tw-bg-input tw-text-foreground"
              disabled={isLoadingPrimaryColor || isSavingColor}
            />
            <Button onClick={handleSavePrimaryColor} disabled={isLoadingPrimaryColor || isSavingColor}>
              {isSavingColor && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
              Save Color
            </Button>
          </div>
        </div>
        {/* Add more settings here as needed */}
      </CardContent>
    </Card>
  );
};

export default AppSettingsForm;