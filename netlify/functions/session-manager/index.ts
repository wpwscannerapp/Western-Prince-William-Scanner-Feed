import type { Handler, HandlerEvent } from "@netlify/functions";
import { getStore } from '@netlify/blobs';

// Define the structure of a session stored in Netlify Blobs
interface BlobSessionData {
  userId: string;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
}

// Initialize the sessionsStore once outside the handler for better performance
// and to ensure it's ready.
let sessionsStore: ReturnType<typeof getStore>;

const handler: Handler = async (event: HandlerEvent) => {
  console.log(`[Session Manager] Function invoked. HTTP Method: ${event.httpMethod}`);

  if (event.httpMethod !== "POST") {
    console.warn(`[Session Manager] Method Not Allowed: ${event.httpMethod}`);
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Initialize store if not already initialized
  if (!sessionsStore) {
    try {
      sessionsStore = getStore('user_sessions');
      console.log("[Session Manager] Netlify Blobs store initialized.");
    } catch (initError: any) {
      console.error("[Session Manager] Error initializing Netlify Blobs store:", initError.message, initError.stack);
      return { statusCode: 500, body: JSON.stringify({ error: "Failed to initialize session store." }) };
    }
  }

  try {
    const { action, payload } = JSON.parse(event.body || '{}');
    console.log(`[Session Manager] Action: ${action}, Payload:`, payload);

    switch (action) {
      case 'createSession': {
        const { sessionId, userId, expiresAt } = payload;
        if (!sessionId || !userId || !expiresAt) {
          console.error("[Session Manager] Missing required fields for createSession:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields for createSession." }) };
        }
        const blobData: BlobSessionData = { userId, expiresAt, createdAt: new Date().toISOString() };
        
        // Calculate TTL in seconds
        const expiresAtDate = new Date(expiresAt);
        const now = new Date();
        const ttlSeconds = Math.max(0, Math.floor((expiresAtDate.getTime() - now.getTime()) / 1000));

        console.log(`[Session Manager] createSession: Setting blob for sessionId: ${sessionId}, userId: ${userId}, expiresAt: ${expiresAt}, TTL: ${ttlSeconds}s`);
        await sessionsStore.setJSON(sessionId, blobData, { ttl: ttlSeconds }); 
        console.log(`[Session Manager] createSession: Blob set successfully for sessionId: ${sessionId}`);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'deleteSession': {
        const { sessionId } = payload;
        if (!sessionId) {
          console.error("[Session Manager] Missing sessionId for deleteSession:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing sessionId for deleteSession." }) };
        }
        console.log(`[Session Manager] deleteSession: Deleting blob for sessionId: ${sessionId}`);
        await sessionsStore.delete(sessionId);
        console.log(`[Session Manager] deleteSession: Blob deleted successfully for sessionId: ${sessionId}`);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'deleteAllSessionsForUser': {
        const { userId } = payload;
        if (!userId) {
          console.error("[Session Manager] Missing userId for deleteAllSessionsForUser:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId for deleteAllSessionsForUser." }) };
        }
        console.log(`[Session Manager] deleteAllSessionsForUser: Listing blobs to delete for userId: ${userId}`);
        const { blobs } = await sessionsStore.list();
        const deletePromises = [];
        for (const blob of blobs) {
          console.log(`[Session Manager] deleteAllSessionsForUser: Checking blob key: ${blob.key}`);
          try {
            const blobContent = await sessionsStore.get(blob.key);
            const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
            if (blobData && blobData.userId === userId) {
              console.log(`[Session Manager] deleteAllSessionsForUser: Deleting blob key: ${blob.key} for userId: ${userId}`);
              deletePromises.push(sessionsStore.delete(blob.key));
            }
          } catch (blobReadError: any) {
            console.error(`[Session Manager] Error reading/parsing blob ${blob.key} for deleteAllSessionsForUser:`, blobReadError.message);
          }
        }
        await Promise.all(deletePromises);
        console.log(`[Session Manager] deleteAllSessionsForUser: All matching blobs deleted for userId: ${userId}`);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'countActiveSessions': {
        const { userId } = payload;
        if (!userId) {
          console.error("[Session Manager] Missing userId for countActiveSessions:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId for countActiveSessions." }) };
        }
        console.log(`[Session Manager] countActiveSessions: Listing blobs to count for userId: ${userId}`);
        const { blobs } = await sessionsStore.list();
        let count = 0;
        const now = new Date();
        for (const blob of blobs) {
          console.log(`[Session Manager] countActiveSessions: Checking blob key: ${blob.key}`);
          try {
            const blobContent = await sessionsStore.get(blob.key);
            const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
            if (blobData && blobData.userId === userId && new Date(blobData.expiresAt) > now) {
              count++;
            }
          } catch (blobReadError: any) {
            console.error(`[Session Manager] Error reading/parsing blob ${blob.key} for countActiveSessions:`, blobReadError.message);
          }
        }
        console.log(`[Session Manager] countActiveSessions: Found ${count} active sessions for userId: ${userId}`);
        return { statusCode: 200, body: JSON.stringify({ count }) };
      }
      case 'deleteOldestSessions': {
        const { userId, limit } = payload;
        if (!userId || typeof limit !== 'number') {
          console.error("[Session Manager] Missing userId or limit for deleteOldestSessions:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId or limit for deleteOldestSessions." }) };
        }
        console.log(`[Session Manager] deleteOldestSessions: Listing blobs to delete oldest for userId: ${userId}, limit: ${limit}`);
        const { blobs } = await sessionsStore.list();
        const userSessions: { key: string; data: BlobSessionData }[] = [];

        for (const blob of blobs) {
          console.log(`[Session Manager] deleteOldestSessions: Checking blob key: ${blob.key}`);
          try {
            const blobContent = await sessionsStore.get(blob.key);
            const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
            if (blobData && blobData.userId === userId) {
              userSessions.push({ key: blob.key, data: blobData });
            }
          } catch (blobReadError: any) {
            console.error(`[Session Manager] Error reading/parsing blob ${blob.key} for deleteOldestSessions:`, blobReadError.message);
          }
        }

        if (userSessions.length >= limit) {
          userSessions.sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());
          const sessionsToDelete = userSessions.slice(0, userSessions.length - limit + 1);
          console.log(`[Session Manager] deleteOldestSessions: Deleting ${sessionsToDelete.length} oldest sessions.`);
          const deletePromises = sessionsToDelete.map(s => sessionsStore.delete(s.key));
          await Promise.all(deletePromises);
        }
        console.log(`[Session Manager] deleteOldestSessions: Oldest sessions deleted for userId: ${userId}`);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'isValidSession': {
        const { userId, sessionId } = payload;
        if (!userId || !sessionId) {
          console.error("[Session Manager] Missing userId or sessionId for isValidSession:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId or sessionId for isValidSession." }) };
        }
        console.log(`[Session Manager] isValidSession: Getting blob for sessionId: ${sessionId}`);
        let isValid = false;
        try {
          const blobContent = await sessionsStore.get(sessionId);
          const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
          isValid = blobData !== null && blobData.userId === userId && new Date(blobData.expiresAt) > new Date();
        } catch (blobReadError: any) {
          console.error(`[Session Manager] Error reading/parsing blob ${sessionId} for isValidSession:`, blobReadError.message);
        }
        console.log(`[Session Manager] isValidSession: Session ${sessionId} is valid: ${isValid}`);
        return { statusCode: 200, body: JSON.stringify({ isValid }) };
      }
      default:
        console.error("[Session Manager] Invalid action received:", action);
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid action." }) };
    }
  } catch (error: any) {
    console.error("[Session Manager] Netlify Function execution error:", error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

export { handler };