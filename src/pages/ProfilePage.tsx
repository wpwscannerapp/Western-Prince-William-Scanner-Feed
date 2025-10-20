import ProfileForm from '@/components/ProfileForm';
import NotificationSettingsForm from '@/components/NotificationSettingsForm'; // Import NotificationSettingsForm
import { PROFILE_TITLE, PROFILE_DESCRIPTION } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService, Profile } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; // Import CardContent
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs components
import { useProfilePageContext } from '@/App'; // Import the context hook

const ProfilePage: React.FC = () => {
  const { user, session, authReady } = useAuth(); // Destructure session and authReady from useAuth
  const isWebPushInitialized = useProfilePageContext(); // Consume from context, renamed variable

  const { isLoading: isProfileLoading, isError: isProfileError, error: profileError } = useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id || !session) throw new Error('No user ID or session available');
      return await ProfileService.fetchProfile(user.id, session);
    },
    enabled: authReady && !!user?.id && !!session, // Ensure query is enabled only when auth is ready and user/session exist
  });

  if (isProfileLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading profile...</p>
      </div>
    );
  }

  if (isProfileError) {
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
    <div className="tw-container tw-mx-auto tw-p-4 tw-max-w-3xl"> {/* Increased max-w for tabs */}
      <Card className="tw-w-full tw-mx-auto tw-bg-card tw-shadow-lg">
        <CardHeader className="tw-text-center">
          <CardTitle className="tw-text-3xl tw-font-bold">{PROFILE_TITLE}</CardTitle>
          <CardDescription className="tw-text-muted-foreground">{PROFILE_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent className="tw-p-6"> {/* Added padding to CardContent */}
          <Tabs defaultValue="profile-details" className="tw-w-full">
            <TabsList className="tw-grid tw-w-full tw-grid-cols-2">
              <TabsTrigger value="profile-details">Profile Details</TabsTrigger>
              <TabsTrigger value="notification-settings">Notifications</TabsTrigger>
            </TabsList>
            <TabsContent value="profile-details" className="tw-mt-6">
              <ProfileForm />
            </TabsContent>
            <TabsContent value="notification-settings" className="tw-mt-6">
              <NotificationSettingsForm isWebPushInitialized={isWebPushInitialized} /> {/* Pass prop */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;