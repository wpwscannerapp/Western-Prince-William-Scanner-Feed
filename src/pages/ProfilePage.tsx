import React from 'react';
import { MadeWithDyad } from '@/components/made-with-dyad';

const ProfilePage = () => {
  return (
    <div className="container mx-auto p-4 pt-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Profile</h1>
      <p className="text-center text-muted-foreground">
        This is your profile page. Here you can manage your account settings.
      </p>
      <MadeWithDyad />
    </div>
  );
};

export default ProfilePage;