import type { Handler, HandlerEvent } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

interface SessionData {
  sessionId: string;
  userId: string;
  expiresAt: number; // Unix timestamp in milliseconds
  createdAt: number; // Unix timestamp in milliseconds
}

export const handler: Handler = async (event: HandlerEvent) => {
  const store = getStore('sessions');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (jsonError: any) {
    console.error('Failed to parse JSON payload:', jsonError.message);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON payload.' }), headers: { 'Content-Type': 'application/json' } };
  }

  const { action, payload } = body;

  try {
    switch (action) {
      case 'createSession': {
        const { sessionId, userId, expiresAt } = payload;
        if (!sessionId || !userId || !expiresAt) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Missing sessionId, userId, or expiresAt for createSession.' }) };
        }
        const sessionData: SessionData = {
          sessionId,
          userId,
          expiresAt: new Date(expiresAt).getTime(), // Convert ISO string to timestamp
          createdAt: Date.now(),
        };
        await store.setJSON(sessionId, sessionData);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }

      case 'deleteSession': {
        const { sessionId } = payload;
        if (!sessionId) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Missing sessionId for deleteSession.' }) };
        }
        await store.delete(sessionId);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }

      case 'deleteAllSessionsForUser': {
        const { userId } = payload;
        if (!userId) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId for deleteAllSessionsForUser.' }) };
        }
        const keys = await store.list();
        const deletePromises = [];
        for (const keyMeta of keys.results) {
          const sessionData = await store.get(keyMeta.key, { type: 'json' }) as SessionData | null;
          if (sessionData && sessionData.userId === userId) {
            deletePromises.push(store.delete(keyMeta.key));
          }
        }
        await Promise.all(deletePromises);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }

      case 'countActiveSessions': {
        const { userId } = payload;
        if (!userId) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId for countActiveSessions.' }) };
        }
        const keys = await store.list();
        let count = 0;
        for (const keyMeta of keys.results) {
          const sessionData = await store.get(keyMeta.key, { type: 'json' }) as SessionData | null;
          if (sessionData && sessionData.userId === userId && sessionData.expiresAt > Date.now()) {
            count++;
          }
        }
        return { statusCode: 200, body: JSON.stringify({ count }) };
      }

      case 'deleteOldestSessions': {
        const { userId, limit } = payload; // limit is the max number of sessions to keep
        if (!userId || typeof limit !== 'number') {
          return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId or invalid limit for deleteOldestSessions.' }) };
        }
        const keys = await store.list();
        const userSessions: (SessionData & { key: string })[] = [];
        for (const keyMeta of keys.results) {
          const sessionData = await store.get(keyMeta.key, { type: 'json' }) as SessionData | null;
          if (sessionData && sessionData.userId === userId && sessionData.expiresAt > Date.now()) {
            userSessions.push({ ...sessionData, key: keyMeta.key });
          }
        }
        userSessions.sort((a, b) => a.createdAt - b.createdAt); // Sort by oldest first

        if (userSessions.length > limit) {
          const sessionsToDelete = userSessions.slice(0, userSessions.length - limit);
          const deletePromises = sessionsToDelete.map(session => store.delete(session.key));
          await Promise.all(deletePromises);
        }
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }

      case 'isValidSession': {
        const { sessionId, userId } = payload;
        if (!sessionId || !userId) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Missing sessionId or userId for isValidSession.' }) };
        }
        const sessionData = await store.get(sessionId, { type: 'json' }) as SessionData | null;
        const isValid = sessionData && sessionData.userId === userId && sessionData.expiresAt > Date.now();
        return { statusCode: 200, body: JSON.stringify({ isValid }) };
      }

      default:
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action.' }) };
    }
  } catch (error: any) {
    console.error('Session manager error:', error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};