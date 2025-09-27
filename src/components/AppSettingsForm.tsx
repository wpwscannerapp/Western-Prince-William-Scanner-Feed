import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/useTheme';

const AppSettingsForm: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

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
        {/* Add more settings here as needed */}
      </CardContent>
    </Card>
  );
};

export default AppSettingsForm;