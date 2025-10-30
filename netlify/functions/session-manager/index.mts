// netlify/functions/session-manager/index.mts
import type { Handler, HandlerEvent } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

interface SessionData {
  sessionId: string
  userId: string
  expiresAt: number
  createdAt: number
}

export const handler: Handler = async (event: HandlerEvent) => {
  try {
    console.log('BLOBS ENV:', {
      siteId: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN?.slice(0, 10) + '...'
    })

    const store = getStore({
      name: 'sessions',
      siteID: process.env.NETLIFY_SITE_ID!,
      token: process.env.NETLIFY_API_TOKEN!
    })

    console.log('BLOBS STORE INITIALIZED')

    if (!event.body) return { statusCode: 400, body: 'Missing body' }
    const body = JSON.parse(event.body)
    const { action, payload } = body

    if (!action) return { statusCode: 400, body: JSON.stringify({ error: 'Missing action' }) }

    // CREATE
    if (action === 'createSession' && payload?.sessionId && payload?.userId && payload?.expiresAt) {
      const { sessionId, userId, expiresAt: expiresAtISO } = payload
      const expiresAt = new Date(expiresAtISO).getTime()

      const data: SessionData = { sessionId, userId, expiresAt, createdAt: Date.now() }
      await store.setJSON(sessionId, data)
      return { statusCode: 200, body: JSON.stringify({ success: true }) }
    }

    // VALIDATE
    if (action === 'isValidSession' && payload?.sessionId) {
      const data = await store.get(payload.sessionId, { type: 'json' }) as SessionData | null
      if (data && data.expiresAt > Date.now()) {
        return { statusCode: 200, body: JSON.stringify({ isValid: true, userId: data.userId }) }
      }
      return { statusCode: 200, body: JSON.stringify({ isValid: false }) }
    }

    // DELETE SINGLE
    if (action === 'deleteSession' && payload?.sessionId) {
      await store.delete(payload.sessionId)
      return { statusCode: 200, body: JSON.stringify({ success: true }) }
    }

    // DELETE ALL FOR USER
    if (action === 'deleteAllSessionsForUser' && payload?.userId) {
      const list = await store.list()
      let deleted = 0
      for (const { key } of list.blobs) {
        const data = await store.get(key, { type: 'json' }) as SessionData | null
        if (data && data.userId === payload.userId) { // Explicit null check for data
          await store.delete(key)
          deleted++
        }
      }
      return { statusCode: 200, body: JSON.stringify({ success: true, deleted }) }
    }

    // COUNT ACTIVE
    if (action === 'countActiveSessions' && payload?.userId) {
      const list = await store.list()
      let count = 0
      for (const { key } of list.blobs) {
        const data = await store.get(key, { type: 'json' }) as SessionData | null
        if (data && data.userId === payload.userId && data.expiresAt > Date.now()) { // Explicit null check for data
          count++
        }
      }
      return { statusCode: 200, body: JSON.stringify({ count }) }
    }

    // DELETE OLDEST
    if (action === 'deleteOldestSessions' && payload?.userId && typeof payload?.limit === 'number') {
      const list = await store.list()
      const userSessions: { key: string; createdAt: number }[] = []

      for (const { key } of list.blobs) {
        const data = await store.get(key, { type: 'json' }) as SessionData | null
        if (data && data.userId === payload.userId && data.expiresAt > Date.now()) { // Explicit null check for data
          userSessions.push({ key, createdAt: data.createdAt })
        }
      }

      if (userSessions.length > payload.limit) {
        const toDelete = userSessions
          .sort((a, b) => a.createdAt - b.createdAt)
          .slice(0, userSessions.length - payload.limit)

        for (const { key } of toDelete) await store.delete(key)
        return { statusCode: 200, body: JSON.stringify({ success: true, deleted: toDelete.length }) }
      }
      return { statusCode: 200, body: JSON.stringify({ success: true, deleted: 0 }) }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) }
  } catch (error: any) {
    console.error('FATAL ERROR:', error.message)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}