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
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Initialize store if not already initialized
  if (!sessionsStore) {
    sessionsStore = getStore('user_sessions');
  }

  try {
    const { action, payload } = JSON.parse(event.body || '{}');
    console.log(`Session Manager: Action: ${action}, Payload:`, payload);

    switch (action) {
      case 'createSession': {
        const { sessionId, userId, expiresAt } = payload;
        if (!sessionId || !userId || !expiresAt) {
          console.error("Missing required fields for createSession:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields for createSession." }) };
        }
        const blobData: BlobSessionData = { userId, expiresAt, createdAt: new Date().toISOString() };
        console.log(`createSession: Setting blob for sessionId: ${sessionId}, userId: ${userId}, expiresAt: ${expiresAt}`);
        await sessionsStore.setJSON(sessionId, blobData, { expiresAt: expiresAt }); 
        console.log(`createSession: Blob set successfully for sessionId: ${sessionId}`);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'deleteSession': {
        const { sessionId } = payload;
        if (!sessionId) {
          console.error("Missing sessionId for deleteSession:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing sessionId for deleteSession." }) };
        }
        console.log(`deleteSession: Deleting blob for sessionId: ${sessionId}`);
        await sessionsStore.delete(sessionId);
        console.log(`deleteSession: Blob deleted successfully for sessionId: ${sessionId}`);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'deleteAllSessionsForUser': {
        const { userId } = payload;
        if (!userId) {
          console.error("Missing userId for deleteAllSessionsForUser:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId for deleteAllSessionsForUser." }) };
        }
        console.log(`deleteAllSessionsForUser: Listing blobs to delete for userId: ${userId}`);
        const { blobs } = await sessionsStore.list();
        const deletePromises = [];
        for (const blob of blobs) {
          console.log(`deleteAllSessionsForUser: Checking blob key: ${blob.key}`);
          const blobContent = await sessionsStore.get(blob.key);
          // Corrected: Convert ArrayBuffer to string before JSON.parse
          const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
          if (blobData && blobData.userId === userId) {
            console.log(`deleteAllSessionsForUser: Deleting blob key: ${blob.key} for userId: ${userId}`);
            deletePromises.push(sessionsStore.delete(blob.key));
          }
        }
        await Promise.all(deletePromises);
        console.log(`deleteAllSessionsForUser: All matching blobs deleted for userId: ${userId}`);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'countActiveSessions': {
        const { userId } = payload;
        if (!userId) {
          console.error("Missing userId for countActiveSessions:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId for countActiveSessions." }) };
        }
        console.log(`countActiveSessions: Listing blobs to count for userId: ${userId}`);
        const { blobs } = await sessionsStore.list();
        let count = 0;
        const now = new Date();
        for (const blob of blobs) {
          console.log(`countActiveSessions: Checking blob key: ${blob.key}`);
          const blobContent = await sessionsStore.get(blob.key);
          // Corrected: Convert ArrayBuffer to string before JSON.parse
          const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
          if (blobData && blobData.userId === userId && new Date(blobData.expiresAt) > now) {
            count++;
          }
        }
        console.log(`countActiveSessions: Found ${count} active sessions for userId: ${userId}`);
        return { statusCode: 200, body: JSON.stringify({ count }) };
      }
      case 'deleteOldestSessions': {
        const { userId, limit } = payload;
        if (!userId || typeof limit !== 'number') {
          console.error("Missing userId or limit for deleteOldestSessions:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId or limit for deleteOldestSessions." }) };
        }
        console.log(`deleteOldestSessions: Listing blobs to delete oldest for userId: ${userId}, limit: ${limit}`);
        const { blobs } = await sessionsStore.list();
        const userSessions: { key: string; data: BlobSessionData }[] = [];

        for (const blob of blobs) {
          console.log(`deleteOldestSessions: Checking blob key: ${blob.key}`);
          const blobContent = await sessionsStore.get(blob.key);
          // Corrected: Convert ArrayBuffer to string before JSON.parse
          const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
          if (blobData && blobData.userId === userId) {
            userSessions.push({ key: blob.key, data: blobData });
          }
        }

        if (userSessions.length >= limit) {
          userSessions.sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());
          const sessionsToDelete = userSessions.slice(0, userSessions.length - limit + 1);
          console.log(`deleteOldestSessions: Deleting ${sessionsToDelete.length} oldest sessions.`);
          const deletePromises = sessionsToDelete.map(s => sessionsStore.delete(s.key));
          await Promise.all(deletePromises);
        }
        console.log(`deleteOldestSessions: Oldest sessions deleted for userId: ${userId}`);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      case 'isValidSession': {
        const { userId, sessionId } = payload;
        if (!userId || !sessionId) {
          console.error("Missing userId or sessionId for isValidSession:", payload);
          return { statusCode: 400, body: JSON.stringify({ error: "Missing userId or sessionId for isValidSession." }) };
        }
        console.log(`isValidSession: Getting blob for sessionId: ${sessionId}`);
        const blobContent = await sessionsStore.get(sessionId);
        // Corrected: Convert ArrayBuffer to string before JSON.parse
        const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
        const isValid = blobData !== null && blobData.userId === userId && new Date(blobData.expiresAt) > new Date();
        console.log(`isValidSession: Session ${sessionId} is valid: ${isValid}`);
        return { statusCode: 200, body: JSON.stringify({ isValid }) };
      }
      default:
        console.error("Invalid action received:", action);
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid action." }) };
    }
  } catch (error: any) {
    console.error("Netlify Function execution error:", error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

export { handler };