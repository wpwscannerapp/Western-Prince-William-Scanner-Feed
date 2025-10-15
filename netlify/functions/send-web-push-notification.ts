import type { Handler, HandlerEvent } from "@netlify/functions"; // Removed HandlerContext as it's unused
import { createClient } from '@supabase/supabase-js';
import { haversineDistance } from './utils/haversineDistance'; // Utility for distance calculation
import webPush from 'web-push'; // Import web-push library

// Ensure these are set in Netlify Environment Variables
const WEB_PUSH_PRIVATE_KEY = process.env.WEB_PUSH_PRIVATE_KEY;
const VITE_WEB_PUSH_PUBLIC_KEY = process.env.VITE_WEB_PUSH_PUBLIC_KEY; // Public key for VAPID
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VITE_APP_URL = process.env.VITE_APP_URL || 'http://localhost:8080'; // Fallback for app URL

const handler: Handler = async (event: HandlerEvent) => { // Removed unused context parameter
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!WEB_PUSH_PRIVATE_KEY || !VITE_WEB_PUSH_PUBLIC_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Web Push or Supabase environment variables.");
    return { statusCode: 500, body: "Configuration error." };
  }

  // Configure web-push with VAPID keys
  webPush.setVapidDetails(
    `mailto:admin@${new URL(VITE_APP_URL).hostname}`, // Contact email for VAPID
    VITE_WEB_PUSH_PUBLIC_KEY,
    WEB_PUSH_PRIVATE_KEY
  );

  try {
    const payload = JSON.parse(event.body || '{}');
    const newAlert = payload.record; // Supabase trigger payload

    if (!newAlert || !newAlert.id || !newAlert.type || !newAlert.latitude || !newAlert.longitude || !newAlert.description || !newAlert.title) {
      console.warn("Invalid alert payload received:", newAlert);
      return { statusCode: 400, body: "Invalid alert payload." };
    }

    console.log("Received new alert:", newAlert.id, newAlert.title);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all users who have enabled notifications and have a push_subscription
    const { data: userSettings, error: settingsError } = await supabaseAdmin
      .from('user_notification_settings')
      .select('*')
      .eq('enabled', true)
      .not('push_subscription', 'is', null); // Only fetch users with a subscription

    if (settingsError) {
      console.error("Error fetching user notification settings:", settingsError);
      return { statusCode: 500, body: "Failed to fetch user settings." };
    }

    if (!userSettings || userSettings.length === 0) {
      console.log("No users with enabled notification settings and push subscriptions found.");
      return { statusCode: 200, body: "No recipients." };
    }

    const notificationPromises: Promise<any>[] = [];
    const notificationPayload = JSON.stringify({
      title: newAlert.title,
      body: newAlert.description,
      url: `${VITE_APP_URL}/home/incidents`, // Link to incidents page
      data: {
        alertId: newAlert.id,
        type: newAlert.type,
        location: newAlert.location,
        latitude: newAlert.latitude,
        longitude: newAlert.longitude,
      },
    });

    for (const settings of userSettings) {
      if (!settings.push_subscription) {
        console.log(`User ${settings.user_id} has no push subscription.`);
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

      // Send the push notification
      notificationPromises.push(
        webPush.sendNotification(settings.push_subscription as webPush.PushSubscription, notificationPayload)
          .then(() => console.log(`Push notification sent to user ${settings.user_id}`))
          .catch(async (err: any) => { // Explicitly type err as any
            console.error(`Failed to send push notification to user ${settings.user_id}:`, err);
            // If the subscription is no longer valid, remove it from the database
            if (err.statusCode === 410 || err.statusCode === 404) { // GONE or NOT_FOUND
              console.log(`Removing expired/invalid subscription for user ${settings.user_id}`);
              await supabaseAdmin
                .from('user_notification_settings')
                .update({ push_subscription: null, enabled: false })
                .eq('user_id', settings.user_id);
            }
          })
      );
    }

    if (notificationPromises.length === 0) {
      console.log("No matching recipients after filtering.");
      return { statusCode: 200, body: "No recipients." };
    }

    console.log(`Attempting to send notifications to ${notificationPromises.length} recipients.`);
    await Promise.allSettled(notificationPromises); // Use allSettled to wait for all promises to resolve/reject

    return { statusCode: 200, body: JSON.stringify({ message: "Web Push notifications processed." }) };

  } catch (error: any) {
    console.error("Function execution error:", error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

export { handler };