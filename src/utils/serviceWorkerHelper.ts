"use client";

import { AnalyticsService } from '@/services/AnalyticsService';

export function unregisterServiceWorkerInDev() {
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(success => {
          if (success) {
            console.log('[ServiceWorkerHelper] Successfully unregistered service worker:', registration.scope);
            AnalyticsService.trackEvent({ name: 'service_worker_unregistered_dev' });
          } else {
            console.warn('[ServiceWorkerHelper] Failed to unregister service worker:', registration.scope);
            AnalyticsService.trackEvent({ name: 'service_worker_unregister_failed_dev' });
          }
        }).catch(error => {
          console.error('[ServiceWorkerHelper] Error during service worker unregistration:', error);
        });
      }
    });
  }
}