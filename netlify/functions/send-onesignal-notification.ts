import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';
import { haversineDistance } from './utils/haversineDistance'; // Utility for distance calculation

// Ensure these are set in Netlify Environment Variables
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing OneSignal or Supabase environment variables.");
    return { statusCode: 500, body: "Configuration error." };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const newAlert = payload.record; // Supabase trigger payload

    if (!newAlert || !newAlert.id || !newAlert.type || !newAlert.latitude || !newAlert.longitude || !newAlert.description || !newAlert.title) {
      console.warn("Invalid alert payload received:", newAlert);
      return { statusCode: 400, body: "Invalid alert payload." };
    }

    console.log("Received new alert:", newAlert.id, newAlert.title);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all users who have enabled notifications
    const { data: userSettings, error: settingsError } = await supabaseAdmin
      .from('user_notification_settings')
      .select('*')
      .eq('enabled', true);

    if (settingsError) {
      console.error("Error fetching user notification settings:", settingsError);
      return { statusCode: 500, body: "Failed to fetch user settings." };
    }

    if (!userSettings || userSettings.length === 0) {
      console.log("No users with enabled notification settings found.");
      return { statusCode: 200, body: "No recipients." };
    }

    const recipients: string[] = [];
    const notificationPromises: Promise<any>[] = [];

    for (const settings of userSettings) {
      if (!settings.onesignal_player_id) {
        console.log(`User ${settings.user_id} has no OneSignal Player ID.`);
        continue;
      }

      // 1. Filter by preferred types
      const alertType = newAlert.type.toLowerCase();
      const preferredTypes = settings.preferred_types.map((t: string) => t.toLowerCase());
      if (preferredTypes.length > 0 && !preferredTypes.includes(alertType)) {
        console.log(`User ${settings.user_id} filtered out by type: ${newAlert.type}`);
        continue;
      }

      // 2. Filter by location and radius
      if (settings.latitude && settings.longitude && settings.radius_miles) {
        const distance = haversineDistance(
          newAlert.latitude,
          newAlert.longitude,
          settings.latitude,
          settings.longitude
        ); // Distance in miles

        if (distance > settings.radius_miles) {
          console.log(`User ${settings.user_id} filtered out by distance: ${distance.toFixed(2)} miles (radius: ${settings.radius_miles})`);
          continue;
        }
      } else {
        console.log(`User ${settings.user_id} has no location settings, sending notification.`);
      }

      recipients.push(settings.onesignal_player_id);
    }

    if (recipients.length === 0) {
      console.log("No matching recipients after filtering.");
      return { statusCode: 200, body: "No matching recipients." };
    }

    console.log(`Sending notification to ${recipients.length} recipients.`);

    const notification = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: recipients,
      contents: { en: newAlert.description },
      headings: { en: newAlert.title },
      data: {
        alertId: newAlert.id,
        type: newAlert.type,
        location: newAlert.location,
        latitude: newAlert.latitude,
        longitude: newAlert.longitude,
      },
      url: `${process.env.VITE_APP_URL}/home/incidents`, // Link to incidents page
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("OneSignal API error:", response.status, responseData);
      return { statusCode: response.status, body: JSON.stringify(responseData) };
    }

    console.log("OneSignal notification sent successfully:", responseData);
    return { statusCode: 200, body: JSON.stringify({ message: "Notifications sent.", oneSignalResponse: responseData }) };

  } catch (error: any) {
    console.error("Function execution error:", error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

export { handler };