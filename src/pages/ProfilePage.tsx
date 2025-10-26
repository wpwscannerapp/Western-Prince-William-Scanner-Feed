"use client";

import React, { useEffect } from 'react';
import ProfileForm from '@/components/ProfileForm';
import NotificationSettingsForm from '@/components/NotificationSettingsForm';
import { PROFILE_TITLE, PROFILE_DESCRIPTION } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService, Profile } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfilePageContext } from '@/context/ProfilePageContext';
import { useIsSubscribed } from '@/hooks/useIsSubscribed';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import SubscribeOverlay from '@/components/SubscribeOverlay';
import { useNavigate } from 'react-router-dom';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

const ProfilePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const isWebPushInitialized = useProfilePageContext();
  const { isSubscribed, loading: isSubscribedLoading } = useIsSubscribed();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
      AnalyticsService.trackEvent({ name: 'profile_page_redirect', properties: { reason: 'unauthenticated' } });
    }
  }, [authLoading, user, navigate]);

  const { isLoading: isProfileLoading, isError: isProfileError, error: profileError } = useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: () => user ? ProfileService.fetchProfile(user.id) : Promise.resolve(null),
    enabled: !!user && !authLoading,
  });

  if (authLoading || !user || isProfileLoading || isSubscribedLoading || isAdminLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading profile" />
        <p className="tw-ml-2">Loading profile...</p>
      </div>
    );
  }

  if (isProfileError) {
    AnalyticsService.trackEvent({ name: 'profile_page_load_failed', properties: { error: profileError.message } });
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Error Loading Profile</h1>
          <p className="tw-text-muted-foreground">{handleError(profileError, 'Failed to load your profile.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-3xl">
      <Card className="tw-w-full tw-mx-auto tw-bg-card tw-shadow-lg">
        <CardHeader className="tw-text-center">
          <CardTitle className="tw-text-3xl tw-font-bold">{PROFILE_TITLE}</CardTitle>
          <CardDescription className="tw-text-muted-foreground">{PROFILE_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6">
          <div className={`tw-space-y-6 ${!isSubscribed && !isAdmin ? 'tw-relative' : ''}`} aria-live="polite">
            <div className={!isSubscribed && !isAdmin ? 'tw-blur-sm tw-pointer-events-none' : ''}>
              <Tabs defaultValue="profile-details" className="tw-w-full">
                <TabsList className="tw-grid tw-w-full tw-grid-cols-2">
                  <TabsTrigger value="profile-details" aria-label="Profile Details tab">Profile Details</TabsTrigger>
                  <TabsTrigger value="notification-settings" aria-label="Notification Settings tab">Notifications</TabsTrigger>
                </TabsList>
                <TabsContent value="profile-details" className="tw-mt-6">
                  <ProfileForm />
                </TabsContent>
                <TabsContent value="notification-settings" className="tw-mt-6">
                  <NotificationSettingsForm isWebPushInitialized={isWebPushInitialized} />
                </TabsContent>
              </Tabs>
            </div>
            {!isSubscribed && !isAdmin && <SubscribeOverlay />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;