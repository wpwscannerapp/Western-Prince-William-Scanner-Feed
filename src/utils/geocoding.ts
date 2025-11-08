"use client";

import { handleError } from './errorHandler';
import { AnalyticsService } from '@/services/AnalyticsService';
import { GOOGLE_MAPS_KEY } from '@/config';

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = GOOGLE_MAPS_KEY;
  if (!apiKey) {
    handleError(null, "Google Maps API key missing for geocoding.");
    AnalyticsService.trackEvent({ name: 'geocode_failed', properties: { reason: 'missing_api_key' } });
    return null;
  }

  if (!address) {
    AnalyticsService.trackEvent({ name: 'geocode_failed', properties: { reason: 'empty_address' } });
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) {
      const errorMessage = data.error_message || `Geocoding failed with status: ${data.status}`;
      handleError(null, `Could not find coordinates for address: "${address}". ${errorMessage}`);
      AnalyticsService.trackEvent({ name: 'geocode_failed', properties: { address, reason: data.status, error: errorMessage } });
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    AnalyticsService.trackEvent({ name: 'geocode_success', properties: { address, latitude: lat, longitude: lng } });
    return { lat, lng };
  } catch (err: any) {
    handleError(err, `Geocode request failed: ${err.message}`);
    AnalyticsService.trackEvent({ name: 'geocode_failed', properties: { address, reason: 'request_failed', error: err.message } });
    return null;
  }
}