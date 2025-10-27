import { getStore } from '@netlify/blobs';

// Define the structure of a session stored in Netlify Blobs
interface BlobSessionData {
  userId: string;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
}

const getCompositeKey = (userId: string, sessionId: string) => `${userId}_${sessionId}`;

const handler = async (req: Request): Promise<Response> => {
  console.log(`[Session Manager] Function invoked. HTTP Method: ${req.method}`);

  if (req.method !== "POST") {
    console.warn(`[Session Manager] Method Not Allowed: ${req.method}`);
    return new Response("Method Not Allowed", { status: 405 });
  }

  let sessionsStore: ReturnType<typeof getStore>;
  try {
    sessionsStore = getStore('user_sessions');
    console.log("[Session Manager] Netlify Blobs store initialized.");
  } catch (initError: any) {
    console.error("[Session Manager] Error initializing Netlify Blobs store:", initError.message, initError.stack);
    return new Response(JSON.stringify({ error: "Failed to initialize session store." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { action, payload } = await req.json();
    console.log(`[Session Manager] Action: ${action}, Payload:`, payload);

    switch (action) {
      case 'createSession': {
        const { sessionId, userId, expiresAt } = payload;
        if (!sessionId || !userId || !expiresAt) {
          console.error("[Session Manager] Missing required fields for createSession:", payload);
          return new Response(JSON.stringify({ error: "Missing required fields for createSession." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const blobData: BlobSessionData = { userId, expiresAt, createdAt: new Date().toISOString() };
        const key = getCompositeKey(userId, sessionId);
        
        console.log(`[Session Manager] createSession: Setting blob for key: ${key}`);
        await sessionsStore.setJSON(key, blobData); 
        console.log(`[Session Manager] createSession: Blob set successfully for key: ${key}`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'deleteSession': {
        const { userId, sessionId } = payload; // Need userId here too
        if (!userId || !sessionId) {
          console.error("[Session Manager] Missing userId or sessionId for deleteSession:", payload);
          return new Response(JSON.stringify({ error: "Missing userId or sessionId for deleteSession." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const key = getCompositeKey(userId, sessionId);
        console.log(`[Session Manager] deleteSession: Deleting blob for key: ${key}`);
        await sessionsStore.delete(key);
        console.log(`[Session Manager] deleteSession: Blob deleted successfully for key: ${key}`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'deleteAllSessionsForUser': {
        const { userId } = payload;
        if (!userId) {
          console.error("[Session Manager] Missing userId for deleteAllSessionsForUser:", payload);
          return new Response(JSON.stringify({ error: "Missing userId for deleteAllSessionsForUser." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        console.log(`[Session Manager] deleteAllSessionsForUser: Listing blobs with prefix: ${userId}_`);
        const { blobs } = await sessionsStore.list({ prefix: userId + '_' }); // Use prefix filtering
        const deletePromises = blobs.map(blob => {
          console.log(`[Session Manager] deleteAllSessionsForUser: Deleting blob key: ${blob.key}`);
          return sessionsStore.delete(blob.key);
        });
        await Promise.all(deletePromises);
        console.log(`[Session Manager] deleteAllSessionsForUser: All matching blobs deleted for userId: ${userId}`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'countActiveSessions': {
        const { userId } = payload;
        if (!userId) {
          console.error("[Session Manager] Missing userId for countActiveSessions:", payload);
          return new Response(JSON.stringify({ error: "Missing userId for countActiveSessions." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        console.log(`[Session Manager] countActiveSessions: Listing blobs with prefix: ${userId}_`);
        const { blobs } = await sessionsStore.list({ prefix: userId + '_' });
        let count = 0;
        const now = new Date();
        for (const blob of blobs) {
          console.log(`[Session Manager] countActiveSessions: Getting blob content for key: ${blob.key}`);
          try {
            const blobContent = await sessionsStore.get(blob.key);
            const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
            if (blobData && new Date(blobData.expiresAt) > now) { // userId check is implicit with prefix
              count++;
            }
          } catch (blobReadError: any) {
            console.error(`[Session Manager] Error reading/parsing blob ${blob.key} for countActiveSessions:`, blobReadError.message);
          }
        }
        console.log(`[Session Manager] countActiveSessions: Found ${count} active sessions for userId: ${userId}`);
        return new Response(JSON.stringify({ count }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'deleteOldestSessions': {
        const { userId, limit } = payload;
        if (!userId || typeof limit !== 'number') {
          console.error("[Session Manager] Missing userId or limit for deleteOldestSessions:", payload);
          return new Response(JSON.stringify({ error: "Missing userId or limit for deleteOldestSessions." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        console.log(`[Session Manager] deleteOldestSessions: Listing blobs with prefix: ${userId}_`);
        const { blobs } = await sessionsStore.list({ prefix: userId + '_' });
        const userSessions: { key: string; data: BlobSessionData }[] = [];

        for (const blob of blobs) {
          console.log(`[Session Manager] deleteOldestSessions: Getting blob content for key: ${blob.key}`);
          try {
            const blobContent = await sessionsStore.get(blob.key);
            const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
            if (blobData) { // userId check is implicit with prefix
              userSessions.push({ key: blob.key, data: blobData });
            }
          } catch (blobReadError: any) {
            console.error(`[Session Manager] Error reading/parsing blob ${blob.key} for deleteOldestSessions:`, blobReadError.message);
          }
        }

        if (userSessions.length > limit) { // Changed to > limit to delete if there are more than allowed
          userSessions.sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());
          const sessionsToDelete = userSessions.slice(0, userSessions.length - limit); // Delete only the excess
          console.log(`[Session Manager] deleteOldestSessions: Deleting ${sessionsToDelete.length} oldest sessions.`);
          const deletePromises = sessionsToDelete.map(s => sessionsStore.delete(s.key));
          await Promise.all(deletePromises);
        }
        console.log(`[Session Manager] deleteOldestSessions: Oldest sessions deleted for userId: ${userId}`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'isValidSession': {
        const { userId, sessionId } = payload;
        if (!userId || !sessionId) {
          console.error("[Session Manager] Missing userId or sessionId for isValidSession:", payload);
          return new Response(JSON.stringify({ error: "Missing userId or sessionId for isValidSession." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const key = getCompositeKey(userId, sessionId);
        console.log(`[Session Manager] isValidSession: Getting blob for key: ${key}`);
        let isValid = false;
        try {
          const blobContent = await sessionsStore.get(key);
          const blobData = blobContent ? JSON.parse(new TextDecoder().decode(blobContent)) as BlobSessionData : null;
          isValid = blobData !== null && new Date(blobData.expiresAt) > new Date(); // userId check is implicit with composite key
        } catch (blobReadError: any) {
          console.error(`[Session Manager] Error reading/parsing blob ${key} for isValidSession:`, blobReadError.message);
        }
        console.log(`[Session Manager] isValidSession: Session ${key} is valid: ${isValid}`);
        return new Response(JSON.stringify({ isValid }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      default:
        console.error("[Session Manager] Invalid action received:", action);
        return new Response(JSON.stringify({ error: "Invalid action." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error: any) {
    console.error("[Session Manager] Netlify Function execution error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export { handler };