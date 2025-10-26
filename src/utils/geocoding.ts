"use client";

import { handleError } from './errorHandler';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address) {
    handleError(null, 'Address cannot be empty for geocoding.');
    AnalyticsService.trackEvent({ name: 'geocode_failed', properties: { reason: 'empty_address' } });
    return null;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WPWScannerApp/1.0 (wpwscannerfeed@gmail.com)',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Geocoding API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const firstResult = data[0];
      AnalyticsService.trackEvent({ name: 'geocode_success', properties: { address, latitude: parseFloat(firstResult.lat), longitude: parseFloat(firstResult.lon) } });
      return {
        latitude: parseFloat(firstResult.lat),
        longitude: parseFloat(firstResult.lon),
        display_name: firstResult.display_name,
      };
    } else {
      handleError(null, `Could not find coordinates for address: "${address}". Please try a more specific location.`);
      AnalyticsService.trackEvent({ name: 'geocode_failed', properties: { address, reason: 'no_results' } });
      return null;
    }
  } catch (error: any) {
    handleError(error, `Failed to geocode address: ${error.message}`);
    AnalyticsService.trackEvent({ name: 'geocode_failed', properties: { address, reason: 'api_error', error: error.message } });
    return null;
  }
}