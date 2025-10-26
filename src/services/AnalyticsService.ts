"use client";

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

export const AnalyticsService = {
  trackEvent(event: AnalyticsEvent) {
    if (import.meta.env.DEV) {
      console.log(`[Analytics] Event: ${event.name}`, event.properties);
    } else {
      // In a production environment, you would integrate with a real analytics platform here.
      // Example:
      // window.gtag('event', event.name, event.properties);
      // window.fathom.trackGoal(event.name, event.properties?.value);
      // console.log(`[Analytics] Production Event: ${event.name}`, event.properties);
    }
  },
};