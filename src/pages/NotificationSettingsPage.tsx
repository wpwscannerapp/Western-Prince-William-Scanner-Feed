import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import NotificationSettingsForm from '@/components/NotificationSettingsForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BellRing } from 'lucide-react';

const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-xl">
      <Button onClick={() => navigate('/home')} variant="outline" className="tw-mb-4 tw-button">
        Back to Dashboard
      </Button>
      <Card className="tw-bg-card tw-border-border tw-shadow-lg tw-text-center">
        <CardHeader>
          <BellRing className="tw-h-16 tw-w-16 tw-text-primary tw-mx-auto tw-mb-4" />
          <CardTitle className="tw-text-3xl tw-font-bold tw-text-foreground">Notification Preferences</CardTitle>
          <CardDescription className="tw-text-muted-foreground tw-mt-2">
            Manage your real-time alert settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6">
          <NotificationSettingsForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettingsPage;