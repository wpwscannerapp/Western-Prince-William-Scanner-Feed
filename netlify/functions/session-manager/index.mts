import type { Handler, HandlerEvent } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

interface SessionData {
  sessionId: string
  userId: string
  expiresAt: number
  createdAt: number
}

export const handler: Handler = async (event: HandlerEvent) => {
  console.log('Session Manager Function Started');

  // Check for required environment variables for Netlify Blobs
  if (!process.env.NETLIFY_SITE_ID || !process.env.NETLIFY_API_TOKEN) {
    console.error('Missing NETLIFY_SITE_ID or NETLIFY_API_TOKEN environment variables.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing Netlify Blobs credentials.' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  console.log('BLOBS ENV (from process.env):', {
    siteId: process.env.NETLIFY_SITE_ID,
    hasToken: !!process.env.NETLIFY_API_TOKEN,
    tokenPrefix: process.env.NETLIFY_API_TOKEN?.slice(0, 10)
  });

  let store;
  try {
    store = getStore('sessions');
    console.log('Netlify Blobs store initialized successfully.');
  } catch (storeError: any) {
    console.error('Failed to initialize Netlify Blobs store:', storeError.message, storeError.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to initialize session store: ${storeError.message}` }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    if (event.httpMethod !== "POST") {
      console.warn(`Method Not Allowed: ${event.httpMethod}`);
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    if (!event.body) {
      console.warn('Missing body in request.');
      return { statusCode: 400, body: 'Missing body' };
    }

    const body = JSON.parse(event.body);
    const { action, payload } = body;
    console.log(`Received action: ${action}, payload:`, payload);

    if (!action) {
      console.warn('Missing action in payload.');
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing action' }) };
    }

    // CREATE
    if (action === 'createSession' && payload?.sessionId && payload?.userId && payload?.expiresAt) {
      const { sessionId, userId, expiresAt: expiresAtISO } = payload;
      const expiresAtTimestamp = new Date(expiresAtISO).getTime();
      console.log(`Action: createSession for userId: ${userId}, sessionId: ${sessionId}`);

      const data: SessionData = {
        sessionId,
        userId,
        expiresAt: expiresAtTimestamp,
        createdAt: Date.now()
      };
      await store.setJSON(sessionId, data);
      console.log(`Session ${sessionId} created successfully.`);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // VALIDATE
    if (action === 'isValidSession' && payload?.sessionId) {
      const { sessionId } = payload;
      console.log(`Action: isValidSession for sessionId: ${sessionId}`);
      const data = await store.get(sessionId, { type: 'json' }) as SessionData | null;
      if (data && data.expiresAt > Date.now()) {
        console.log(`Session ${sessionId} is valid.`);
        return { statusCode: 200, body: JSON.stringify({ isValid: true, userId: data.userId }) };
      }
      console.log(`Session ${sessionId} is invalid or expired.`);
      return { statusCode: 200, body: JSON.stringify({ isValid: false }) };
    }

    // DELETE SINGLE
    if (action === 'deleteSession' && payload?.sessionId) {
      const { sessionId } = payload;
      console.log(`Action: deleteSession for sessionId: ${sessionId}`);
      await store.delete(sessionId);
      console.log(`Session ${sessionId} deleted.`);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // DELETE ALL FOR USER
    if (action === 'deleteAllSessionsForUser' && payload?.userId) {
      const { userId } = payload;
      console.log(`Action: deleteAllSessionsForUser for userId: ${userId}`);
      const list = await store.list();
      let deleted = 0;
      for (const { key } of list.blobs) {
        const data = await store.get(key, { type: 'json' }) as SessionData | null;
        if (data && data.userId === userId) {
          await store.delete(key);
          deleted++;
        }
      }
      console.log(`Deleted ${deleted} sessions for user ${userId}.`);
      return { statusCode: 200, body: JSON.stringify({ success: true, deleted }) };
    }

    // COUNT ACTIVE FOR USER
    if (action === 'countActiveSessions' && payload?.userId) {
      const { userId } = payload;
      console.log(`Action: countActiveSessions for userId: ${userId}`);
      const list = await store.list();
      let count = 0;
      for (const { key } of list.blobs) {
        const data = await store.get(key, { type: 'json' }) as SessionData | null;
        if (data && data.userId === userId && data.expiresAt > Date.now()) {
          count++;
        }
      }
      console.log(`Counted ${count} active sessions for user ${userId}.`);
      return { statusCode: 200, body: JSON.stringify({ count }) };
    }

    // DELETE OLDEST (RESPECT LIMIT)
    if (action === 'deleteOldestSessions' && payload?.userId && typeof payload?.limit === 'number') {
      const { userId, limit } = payload;
      console.log(`Action: deleteOldestSessions for userId: ${userId}, limit: ${limit}`);
      const list = await store.list();
      const userSessions: { key: string; createdAt: number }[] = [];

      for (const { key } of list.blobs) {
        const data = await store.get(key, { type: 'json' }) as SessionData | null;
        if (data && data.userId === userId && data.expiresAt > Date.now()) {
          userSessions.push({ key, createdAt: data.createdAt });
        }
      }

      if (userSessions.length > limit) {
        const toDelete = userSessions
          .sort((a, b) => a.createdAt - b.createdAt)
          .slice(0, userSessions.length - limit);

        for (const { key } of toDelete) {
          await store.delete(key);
        }
        console.log(`Deleted ${toDelete.length} oldest sessions for user ${userId}.`);
        return { statusCode: 200, body: JSON.stringify({ success: true, deleted: toDelete.length }) };
      }
      console.log(`No oldest sessions to delete for user ${userId}.`);
      return { statusCode: 200, body: JSON.stringify({ success: true, deleted: 0 }) };
    }

    console.warn(`Invalid action received: ${action}`);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };
  } catch (error: any) {
    console.error('Session manager function caught an unexpected error:', error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }), headers: { 'Content-Type': 'application/json' } };
  }
}