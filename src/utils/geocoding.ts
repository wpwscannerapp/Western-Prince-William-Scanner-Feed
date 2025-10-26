import { handleError } from './errorHandler';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address) {
    handleError(null, 'Address cannot be empty for geocoding.');
    return null;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WPWScannerApp/1.0 (wpwscannerfeed@gmail.com)', // Identify your application
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const firstResult = data[0];
      return {
        latitude: parseFloat(firstResult.lat),
        longitude: parseFloat(firstResult.lon),
        display_name: firstResult.display_name,
      };
    } else {
      handleError(null, `Could not find coordinates for address: "${address}". Please try a more specific location.`);
      return null;
    }
  } catch (error: any) {
    handleError(error, `Failed to geocode address: ${error.message}`);
    return null;
  }
}