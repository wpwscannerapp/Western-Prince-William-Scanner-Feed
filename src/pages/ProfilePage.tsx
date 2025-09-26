import { MadeWithDyad } from '@/components/made-with-dyad';

const ProfilePage = () => {
  return (
    <div className="tw-container tw-mx-auto tw-p-4 tw-pt-8">
      <h1 className="tw-text-3xl tw-font-bold tw-mb-6 tw-text-center">Profile</h1>
      <p className="tw-text-center tw-text-muted-foreground">
        This is your profile page. Here you can manage your account settings.
      </p>
      <MadeWithDyad />
    </div>
  );
};

export default ProfilePage;