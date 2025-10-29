import { getStore } from '@netlify/blobs';
import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";

// Define the structure of a session stored in Netlify Blobs
interface BlobSessionData {
  userId: string;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
}

const getCompositeKey = (userId: string, sessionId: string) => `${userId}_${sessionId}`;

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  console.log(`[Session Manager] Function invoked. HTTP Method: ${event.httpMethod}`);
  console.log("[Session Manager] Environment check:", {
    hasNetlifyDev: !!process.env.NETLIFY_DEV,
    context: process.env.CONTEXT,
    nodeVersion: process.version,
    // Add other relevant environment variables if needed for debugging
  });

  if (event.httpMethod !== "POST") {
    console.warn(`[Session Manager] Method Not Allowed: ${event.httpMethod}`);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  let sessionsStore: ReturnType<typeof getStore>;
  let retries = 3;
  while (retries > 0) {
    try {
      sessionsStore = getStore('user_sessions');
      console.log("[Session Manager] Netlify Blobs store initialized successfully.");
      break; // Exit loop on success
    } catch (initError: any) {
      retries--;
      console.error(`[Session Manager] Error initializing Netlify Blobs store (attempt ${3 - retries}/3):`, initError.message, initError.stack);
      if (retries === 0) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Failed to initialize session store after multiple attempts: ${initError.message}` }),
          headers: { 'Content-Type': 'application/json' },
        };
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait a bit before retrying
    }
  }

  let action: string;
  let payload: any;
  try {
    ({ action, payload } = JSON.parse(event.body || '{}'));
    console.log(`[Session Manager] Action: ${action}, Payload:`, payload);
  } catch (jsonError: any) {
    console.error("[Session Manager] Failed to parse JSON payload from event body:", jsonError.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON payload." }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    switch (action) {
      case 'createSession': {
        const { sessionId, userId, expiresAt } = payload;
        if (!sessionId || !userId || !expiresAt) {
          console.error("[Session Manager] Missing required fields for createSession:", payload);
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing required fields for createSession." }),
            headers: { 'Content-Type': 'application/json' },
          };
        }
        const blobData: BlobSessionData = { userId, expiresAt, createdAt: new Date().toISOString() };
        const key = getCompositeKey(userId, sessionId);
        
        console.log(`[Session Manager] createSession: Setting blob for key: ${key}`);
        try {
          await sessionsStore.setJSON(key, blobData); 
          console.log(`[Session Manager] createSession: Blob set successfully for key: ${key}`);
        } catch (blobError: any) {
          console.error(`[Session Manager] Error setting blob for key ${key}:`, blobError.message, blobError.stack);
          throw new Error(`Blob operation failed: ${blobError.message}`);
        }
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true }),
          headers: { 'Content-Type': 'application/json' },
        };
      }
      case 'deleteSession': {
        const { userId, sessionId } = payload;
        if (!userId || !sessionId) {
          console.error("[Session Manager] Missing userId or sessionId for deleteSession:", payload);
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing userId or sessionId for deleteSession." }),
            headers: { 'Content-Type': 'application/json' },
          };
        }
        const key = getCompositeKey(userId, sessionId);
        console.log(`[Session Manager] deleteSession: Deleting blob for key: ${key}`);
        try {
          await sessionsStore.delete(key);
          console.log(`[Session Manager] deleteSession: Blob deleted successfully for key: ${key}`);
        } catch (blobError: any) {
          console.error(`[Session Manager] Error deleting blob for key ${key}:`, blobError.message, blobError.stack);
          throw new Error(`Blob operation failed: ${blobError.message}`);
        }
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true }),
          headers: { 'Content-Type': 'application/json' },
        };
      }
      case 'deleteAllSessionsForUser': {
        const { userId } = payload;
        if (!userId) {
          console.error("[Session Manager] Missing userId for deleteAllSessionsForUser:", payload);
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing userId for deleteAllSessionsForUser." }),
            headers: { 'Content-Type': 'application/json' },
          };
        }
        console.log(`[Session Manager] deleteAllSessionsForUser: Listing blobs with prefix: ${userId}_`);
        let blobsToList;
        try {
          const { blobs } = await sessionsStore.list({ prefix: userId + '_' });
          blobsToList = blobs;
        } catch (blobError: any) {
          console.error(`[Session Manager] Error listing blobs for prefix ${userId}_:`, blobError.message, blobError.stack);
          throw new Error(`Blob operation failed: ${blobError.message}`);
        }
        
        const deletePromises = blobsToList.map(blob => {
          console.log(`[Session Manager] deleteAllSessionsForUser: Deleting blob key: ${blob.key}`);
          return sessionsStore.delete(blob.key);
        });
        await Promise.all(deletePromises);
        console.log(`[Session Manager] deleteAllSessionsForUser: All matching blobs deleted for userId: ${userId}`);
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true }),
          headers: { 'Content-Type': 'application/json' },
        };
      }
      case 'countActiveSessions': {
        const { userId } = payload;
        if (!userId) {
          console.error("[Session Manager] Missing userId for countActiveSessions:", payload);
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing userId for countActiveSessions." }),
            headers: { 'Content-Type': 'application/json' },
          };
        }
        console.log(`[Session Manager] countActiveSessions: Listing blobs with prefix: ${userId}_`);
        let blobsToList;
        try {
          const { blobs } = await sessionsStore.list({ prefix: userId + '_' });
          blobsToList = blobs;
        } catch (blobError: any) {
          console.error(`[Session Manager] Error listing blobs for prefix ${userId}_:`, blobError.message, blobError.stack);
          throw new Error(`Blob operation failed: ${blobError.message}`);
        }

        let count = 0;
        const now = new Date();
        for (const blob of blobsToList) {
          console.log(`[Session Manager] countActiveSessions: Getting blob content for key: ${blob.key}`);
          try {
            const blobData = await sessionsStore.get(blob.key, { type: 'json' }) as BlobSessionData | null;
            if (blobData && new Date(blobData.expiresAt) > now) {
              count++;
            }
          } catch (blobReadError: any) {
            console.error(`[Session Manager] Error reading/parsing blob ${blob.key} for countActiveSessions:`, blobReadError.message);
          }
        }
        console.log(`[Session Manager] countActiveSessions: Found ${count} active sessions for userId: ${userId}`);
        return {
          statusCode: 200,
          body: JSON.stringify({ count }),
          headers: { 'Content-Type': 'application/json' },
        };
      }
      case 'deleteOldestSessions': {
        const { userId, limit } = payload;
        if (!userId || typeof limit !== 'number') {
          console.error("[Session Manager] Missing userId or limit for deleteOldestSessions:", payload);
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing userId or limit for deleteOldestSessions." }),
            headers: { 'Content-Type': 'application/json' },
          };
        }
        console.log(`[Session Manager] deleteOldestSessions: Listing blobs with prefix: ${userId}_`);
        let blobsToList;
        try {
          const { blobs } = await sessionsStore.list({ prefix: userId + '_' });
          blobsToList = blobs;
        } catch (blobError: any) {
          console.error(`[Session Manager] Error listing blobs for prefix ${userId}_:`, blobError.message, blobError.stack);
          throw new Error(`Blob operation failed: ${blobError.message}`);
        }

        const userSessions: { key: string; data: BlobSessionData }[] = [];

        for (const blob of blobsToList) {
          console.log(`[Session Manager] deleteOldestSessions: Getting blob content for key: ${blob.key}`);
          try {
            const blobData = await sessionsStore.get(blob.key, { type: 'json' }) as BlobSessionData | null;
            if (blobData) {
              userSessions.push({ key: blob.key, data: blobData });
            }
          } catch (blobReadError: any) {
            console.error(`[Session Manager] Error reading/parsing blob ${blob.key} for deleteOldestSessions:`, blobReadError.message);
          }
        }

        if (userSessions.length > limit) {
          userSessions.sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());
          const sessionsToDelete = userSessions.slice(0, userSessions.length - limit);
          console.log(`[Session Manager] deleteOldestSessions: Deleting ${sessionsToDelete.length} oldest sessions.`);
          const deletePromises = sessionsToDelete.map(s => sessionsStore.delete(s.key));
          await Promise.all(deletePromises);
        }
        console.log(`[Session Manager] deleteOldestSessions: Oldest sessions deleted for userId: ${userId}`);
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true }),
          headers: { 'Content-Type': 'application/json' },
        };
      }
      case 'isValidSession': {
        const { userId, sessionId } = payload;
        if (!userId || !sessionId) {
          console.error("[Session Manager] Missing userId or sessionId for isValidSession:", payload);
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing userId or sessionId for isValidSession." }),
            headers: { 'Content-Type': 'application/json' },
          };
        }
        const key = getCompositeKey(userId, sessionId);
        console.log(`[Session Manager] isValidSession: Getting blob for key: ${key}`);
        let isValid = false;
        try {
          const blobData = await sessionsStore.get(key, { type: 'json' }) as BlobSessionData | null;
          if (blobData) {
            isValid = new Date(blobData.expiresAt) > new Date();
          }
        } catch (blobReadError: any) {
            console.error(`[Session Manager] Error reading/parsing blob ${key} for isValidSession:`, blobReadError.message);
        }
        console.log(`[Session Manager] isValidSession: Session ${key} is valid: ${isValid}`);
        return {
          statusCode: 200,
          body: JSON.stringify({ isValid }),
          headers: { 'Content-Type': 'application/json' },
        };
      }
      default:
        console.error("[Session Manager] Invalid action received:", action);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid action." }),
          headers: { 'Content-Type': 'application/json' },
        };
    }
  } catch (error: any) {
    console.error("[Session Manager] Netlify Function execution error:", error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };