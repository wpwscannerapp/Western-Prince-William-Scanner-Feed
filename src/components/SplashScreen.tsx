const SplashScreen = () => {
  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4 tw-text-center">
      {/* Removed logo image */}
      <h1 className="tw-text-4xl tw-font-bold tw-mb-2">Western Prince William Scanner Feed</h1>
      <p className="tw-text-xl tw-text-muted-foreground">Exclusive Scanner Updates for Western Prince William</p>
    </div>
  );
};

export default SplashScreen;