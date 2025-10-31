import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push'; // Import web-push library

// Ensure these are set in Netlify Environment Variables
const WEB_PUSH_PRIVATE_KEY = process.env.WEB_PUSH_PRIVATE_KEY;
const VITE_WEB_PUSH_PUBLIC_KEY = process.env.VITE_WEB_PUSH_PUBLIC_KEY; // Public key for VAPID
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VITE_APP_URL = process.env.VITE_APP_URL || 'http://localhost:8080'; // Fallback for app URL

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
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

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (jsonError: any) {
    console.error("Failed to parse JSON payload:", jsonError.message);
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON payload." }), headers: { 'Content-Type': 'application/json' } };
  }
  
  try {
    const newAlert = payload.record; // Supabase trigger payload

    if (!newAlert || !newAlert.id || !newAlert.description || !newAlert.title) {
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

    const now = new Date();
    const currentDayOfWeek = now.toLocaleString('en-US', { weekday: 'long' }); // e.g., "Monday"
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    for (const settings of userSettings) {
      if (!settings.push_subscription) {
        console.log(`User ${settings.user_id} has no push subscription.`);
        continue;
      }

      // If user wants all alerts, send it
      if (settings.receive_all_alerts) {
        console.log(`User ${settings.user_id} receives all alerts (24/7).`);
      } else if (settings.customize_time_and_days) {
        // Otherwise, apply time and day filtering if customization is enabled
        const preferredDays = settings.preferred_days || [];
        const preferredStartTime = settings.preferred_start_time; // Format 'HH:MM:SS'
        const preferredEndTime = settings.preferred_end_time; // Format 'HH:MM:SS'

        // Check if current day is in preferred days
        if (preferredDays.length > 0 && !preferredDays.includes(currentDayOfWeek)) {
          console.log(`User ${settings.user_id} filtered out by day: ${currentDayOfWeek}`);
          continue;
        }

        // Check if current time is within preferred time range
        if (preferredStartTime && preferredEndTime) {
          const [startHour, startMinute] = preferredStartTime.split(':').map(Number);
          const [endHour, endMinute] = preferredEndTime.split(':').map(Number);

          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;

          let isWithinTime = false;
          if (startTotalMinutes <= endTotalMinutes) {
            // Normal time range (e.g., 09:00 to 17:00)
            isWithinTime = currentTimeInMinutes >= startTotalMinutes && currentTimeInMinutes <= endTotalMinutes;
          } else {
            // Overnight time range (e.g., 22:00 to 06:00)
            isWithinTime = currentTimeInMinutes >= startTotalMinutes || currentTimeInMinutes <= endTotalMinutes;
          }

          if (!isWithinTime) {
            console.log(`User ${settings.user_id} filtered out by time: ${currentHour}:${currentMinute} UTC not within ${preferredStartTime}-${preferredEndTime} UTC`);
            continue;
          }
        } else if (preferredStartTime || preferredEndTime) {
          // If only one time is set, it's an incomplete setting, so we might skip or send.
          // For now, if only one is set and receive_all_alerts is false, we'll skip.
          console.log(`User ${settings.user_id} has incomplete time settings for customization. Skipping.`);
          continue;
        }
      } else {
        // If neither receive_all_alerts nor customize_time_and_days is true, skip this user
        console.log(`User ${settings.user_id} has neither 'receive all alerts' nor 'customize day and time' enabled. Skipping.`);
        continue;
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

    return { statusCode: 200, body: JSON.stringify({ message: "Web Push notifications processed." }), headers: { 'Content-Type': 'application/json' } };

  } catch (error: any) {
    console.error("Function execution error:", error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }), headers: { 'Content-Type': 'application/json' } };
  }
};

export { handler };