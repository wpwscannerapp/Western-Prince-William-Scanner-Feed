import React from 'react';

const SplashScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 text-center">
      <img
        src="/Logo.jpeg?v=1" // Added cache-busting parameter
        alt="WPW Scanner Feed Logo"
        className="w-32 h-32 mb-6 animate-pulse"
      />
      <h1 className="text-4xl font-bold mb-2">WPW Scanner Feed</h1>
      <p className="text-xl text-muted-foreground">Exclusive Scanner Updates for Western Prince William</p>
    </div>
  );
};

export default SplashScreen;