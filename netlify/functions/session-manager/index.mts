import { Context, getStore } from '@netlify/blobs';

// Define the structure of a session stored in Netlify Blobs
interface BlobSessionData {
  userId: string;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
}

const handler = async (req: Request, context: Context): Promise<Response> => {
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
        
        // Calculate TTL in seconds
        const expiresAtDate = new Date(expiresAt);
        const now = new Date();
        const ttlSeconds = Math.max(0, Math.floor((expiresAtDate.getTime() - now.getTime()) / 1000));

        console.log(`[Session Manager] createSession: Setting blob for sessionId: ${sessionId}, userId: ${userId}, expiresAt: ${expiresAt}, TTL: ${ttlSeconds}s`);
        await sessionsStore.setJSON(sessionId, blobData, { ttl: ttlSeconds }); 
        console.log(`[Session Manager] createSession: Blob set successfully for sessionId: ${sessionId}`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'deleteSession': {
        const { sessionId } = payload;
        if (!sessionId) {
          console.error("[Session Manager] Missing sessionId for deleteSession:", payload);
          return new Response(JSON.stringify({ error: "Missing sessionId for deleteSession." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        console.log(`[Session Manager] deleteSession: Deleting blob for sessionId: ${sessionId}`);
        await sessionsStore.delete(sessionId);
        console.log(`[Session Manager] deleteSession: Blob deleted successfully for sessionId: ${sessionId}`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'deleteAllSessionsForUser': {
        const { userId } = payload;
        if (!userId) {
          console.error("[Session Manager] Missing userId for deleteAllSessionsForUser:", payload);
          return new Response(JSON.stringify({ error: "Missing userId for deleteAllSessionsForUser." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'countActiveSessions': {
        const { userId } = payload;
        if (!userId) {
          console.error("[Session Manager] Missing userId for countActiveSessions:", payload);
          return new Response(JSON.stringify({ error: "Missing userId for countActiveSessions." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
        return new Response(JSON.stringify({ count }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'deleteOldestSessions': {
        const { userId, limit } = payload;
        if (!userId || typeof limit !== 'number') {
          console.error("[Session Manager] Missing userId or limit for deleteOldestSessions:", payload);
          return new Response(JSON.stringify({ error: "Missing userId or limit for deleteOldestSessions." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'isValidSession': {
        const { userId, sessionId } = payload;
        if (!userId || !sessionId) {
          console.error("[Session Manager] Missing userId or sessionId for isValidSession:", payload);
          return new Response(JSON.stringify({ error: "Missing userId or sessionId for isValidSession." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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