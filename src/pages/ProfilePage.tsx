import ProfileForm from '@/components/ProfileForm'; // Import the new ProfileForm
import { MadeWithDyad } from '@/components/made-with-dyad';

const ProfilePage = () => {
  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8 tw-max-w-2xl">
      <h1 className="tw-text-3xl tw-font-bold tw-mb-6 tw-text-center tw-text-foreground">Your Profile</h1>
      <p className="tw-text-center tw-text-muted-foreground tw-mb-8">
        Manage your personal information and avatar.
      </p>
      
      <ProfileForm /> {/* Render the ProfileForm here */}

      <MadeWithDyad />
    </div>
  );
};

export default ProfilePage;