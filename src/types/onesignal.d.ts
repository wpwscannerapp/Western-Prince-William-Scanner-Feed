// Declare the global variable 'OneSignal' directly at the top level
declare const OneSignal: OneSignalSDK;

interface OneSignalSDK {
  init(options: { appId: string; safari_web_id?: string; allowLocalhostAsSecureOrigin?: boolean; notifyButton?: { enable: boolean } }): Promise<void>;
  push(callback: () => void): void;
  Notifications: {
    isPushNotificationsSupported(): boolean;
    addEventListener(event: 'subscriptionchange', callback: (isSubscribed: boolean) => void): void;
    permission: NotificationPermission;
    requestPermission(): Promise<void>;
    isPushEnabled(): Promise<boolean>;
    setSubscription(enabled: boolean): Promise<void>;
  };
  User: {
    addTag(key: string, value: string): Promise<void>;
    PushSubscription: {
      getFCMToken(): Promise<string | null>;
      getId(): Promise<string | null>;
    };
  };
  // Add other OneSignal methods/properties as needed
}

declare global {
  // Also extend the Window interface for window.OneSignal
  interface Window {
    OneSignal: OneSignalSDK;
  }
}