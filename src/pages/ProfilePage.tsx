import ProfileForm from '@/components/ProfileForm';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { PROFILE_TITLE, PROFILE_DESCRIPTION } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query'; // Use useQuery directly
import { useAuth } from '@/hooks/useAuth';
import { ProfileService, Profile } from '@/services/ProfileService'; // Keep ProfileService and Profile for useQuery
import { handleError } from '@/utils/errorHandler';

const ProfilePage = () => {
  const { user } = useAuth();

  // Fetch profile data using useQuery
  const { isLoading: isProfileLoading, isError: isProfileError, error: profileError } = useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: () => user ? ProfileService.fetchProfile(user.id) : Promise.resolve(null),
    enabled: !!user, // Only run query if user exists
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
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8 tw-max-w-2xl">
      <h1 className="tw-text-3xl tw-font-bold tw-mb-6 tw-text-center tw-text-foreground">{PROFILE_TITLE}</h1>
      <p className="tw-text-center tw-text-muted-foreground tw-mb-8">
        {PROFILE_DESCRIPTION}
      </p>
      
      <ProfileForm />

      <MadeWithDyad />
    </div>
  );
};

export default ProfilePage;