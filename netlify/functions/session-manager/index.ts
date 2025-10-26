import type { Handler, HandlerEvent } from "@netlify/functions";
import { getStore } from '@netlify/blobs';

// These environment variables will be set as Netlify secrets
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;
const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN;

// Define the structure of a session stored in Netlify Blobs
interface BlobSessionData {
  userId: string;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!NETLIFY_SITE_ID || !NETLIFY_API_TOKEN) {
    console.error("Netlify Blobs configuration error: NETLIFY_SITE_ID or NETLIFY_API_TOKEN is missing in function environment.");
    return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error: Netlify Blobs credentials missing." }) };
  }

  try {
    const { action, payload } = JSON.parse(event.body || '{}');

    // Initialize the sessionsStore. In a Netlify Function, siteID and token are picked up from environment variables.
    const sessionsStore = getStore('user_sessions');

    switch (action) {
      case 'createSession': {
        const { sessionId, userId, expiresAt, expiresIn } = payload;
        if (!sessionId || !userId || !expiresAt || !expiresIn) {
          return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields for createSession." }) };
        }
        const blobData: BlobSessionData = { userId, expiresAt, createdAt: new Date().toISOString() };
        // Pass ttl as a separate argument
        await sessionsStore.setJSON(sessionId, blobData, expiresIn * 1000);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'deleteSession': {
        const { sessionId } = payload;
        if (!sessionId) {
          return { statusCode: 400, body: JSON.stringify({ error: "Missing sessionId for deleteSession." }) };
        }
        await sessionsStore.delete(sessionId);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'deleteAllSessionsForUser': {
        const { userId } = payload;
        if (!userId) {
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId for deleteAllSessionsForUser." }) };
        }
        const { blobs } = await sessionsStore.list();
        const deletePromises = [];
        for (const blob of blobs) {
          // Corrected to getJSON
          const blobData = await sessionsStore.getJSON(blob.key) as BlobSessionData;
          if (blobData && blobData.userId === userId) {
            deletePromises.push(sessionsStore.delete(blob.key));
          }
        }
        await Promise.all(deletePromises);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'countActiveSessions': {
        const { userId } = payload;
        if (!userId) {
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId for countActiveSessions." }) };
        }
        const { blobs } = await sessionsStore.list();
        let count = 0;
        const now = new Date();
        for (const blob of blobs) {
          // Corrected to getJSON
          const blobData = await sessionsStore.getJSON(blob.key) as BlobSessionData;
          if (blobData && blobData.userId === userId && new Date(blobData.expiresAt) > now) {
            count++;
          }
        }
        return { statusCode: 200, body: JSON.stringify({ count }) };
      }
      case 'deleteOldestSessions': {
        const { userId, limit } = payload;
        if (!userId || typeof limit !== 'number') {
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId or limit for deleteOldestSessions." }) };
        }
        const { blobs } = await sessionsStore.list();
        const userSessions: { key: string; data: BlobSessionData }[] = [];

        for (const blob of blobs) {
          // Corrected to getJSON
          const blobData = await sessionsStore.getJSON(blob.key) as BlobSessionData;
          if (blobData && blobData.userId === userId) {
            userSessions.push({ key: blob.key, data: blobData });
          }
        }

        if (userSessions.length >= limit) {
          userSessions.sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());
          const sessionsToDelete = userSessions.slice(0, userSessions.length - limit + 1);
          const deletePromises = sessionsToDelete.map(s => sessionsStore.delete(s.key));
          await Promise.all(deletePromises);
        }
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'isValidSession': {
        const { userId, sessionId } = payload;
        if (!userId || !sessionId) {
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId or sessionId for isValidSession." }) };
        }
        // Corrected to getJSON
        const blobData = await sessionsStore.getJSON(sessionId) as BlobSessionData;
        const isValid = blobData !== null && blobData.userId === userId && new Date(blobData.expiresAt) > new Date();
        return { statusCode: 200, body: JSON.stringify({ isValid }) };
      }
      default:
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid action." }) };
    }
  } catch (error: any) {
    console.error("Netlify Function execution error:", error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

export { handler };