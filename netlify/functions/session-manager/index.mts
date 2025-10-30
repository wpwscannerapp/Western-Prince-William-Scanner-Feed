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
    const store = getStore('sessions')
    if (!event.body) return { statusCode: 400, body: 'Missing body' }
    const body = JSON.parse(event.body)
    const { action, sessionId, userId, limit } = body

    // CREATE
    if (action === 'create' && sessionId && userId) {
      const data: SessionData = {
        sessionId,
        userId,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        createdAt: Date.now()
      }
      await store.setJSON(sessionId, data)
      return { statusCode: 200, body: JSON.stringify({ success: true }) }
    }

    // VALIDATE
    if (action === 'validate' && sessionId) {
      const data = await store.get(sessionId, { type: 'json' }) as SessionData | null
      if (data && data.expiresAt > Date.now()) {
        return { statusCode: 200, body: JSON.stringify({ valid: true, userId: data.userId }) }
      }
      return { statusCode: 401, body: JSON.stringify({ valid: false }) }
    }

    // DELETE SINGLE
    if (action === 'delete' && sessionId) {
      await store.delete(sessionId)
      return { statusCode: 200, body: JSON.stringify({ success: true }) }
    }

    // DELETE ALL FOR USER
    if (action === 'deleteAll' && userId) {
      const list = await store.list()
      let deleted = 0
      for (const { key } of list.blobs) {
        const data = await store.get(key, { type: 'json' }) as SessionData | null
        if (data?.userId === userId) {
          await store.delete(key)
          deleted++
        }
      }
      return { statusCode: 200, body: JSON.stringify({ deleted }) }
    }

    // COUNT ACTIVE FOR USER
    if (action === 'count' && userId) {
      const list = await store.list()
      let count = 0
      for (const { key } of list.blobs) {
        const data = await store.get(key, { type: 'json' }) as SessionData | null
        if (data?.userId === userId && data.expiresAt > Date.now()) {
          count++
        }
      }
      return { statusCode: 200, body: JSON.stringify({ count }) }
    }

    // DELETE OLDEST (RESPECT LIMIT)
    if (action === 'deleteOldest' && userId && typeof limit === 'number') {
      const list = await store.list()
      const userSessions: { key: string; createdAt: number }[] = []

      for (const { key } of list.blobs) {
        const data = await store.get(key, { type: 'json' }) as SessionData | null
        if (data?.userId === userId && data.expiresAt > Date.now()) {
          userSessions.push({ key, createdAt: data.createdAt })
        }
      }

      if (userSessions.length > limit) {
        const toDelete = userSessions
          .sort((a, b) => a.createdAt - b.createdAt)
          .slice(0, userSessions.length - limit)

        for (const { key } of toDelete) {
          await store.delete(key)
        }
        return { statusCode: 200, body: JSON.stringify({ deleted: toDelete.length }) }
      }
      return { statusCode: 200, body: JSON.stringify({ deleted: 0 }) }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) }
  } catch (error: any) {
    console.error('Session manager error:', error.message)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}