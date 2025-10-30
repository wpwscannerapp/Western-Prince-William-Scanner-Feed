import type { Handler, HandlerEvent } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

interface SessionData {
  sessionId: string
  userId: string
  expiresAt: number
}

export const handler: Handler = async (event: HandlerEvent) => {
  try {
    // Get Blobs store (auto-uses NETLIFY_BLOBS_SITE_ID & TOKEN)
    const store = getStore('sessions')

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const body = event.body ? JSON.parse(event.body) : {}
    const { action, sessionId, userId } = body

    if (action === 'create' && sessionId && userId) {
      const data: SessionData = {
        sessionId,
        userId,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }
      await store.setJSON(sessionId, data)
      return { statusCode: 200, body: JSON.stringify({ success: true }) }
    }

    if (action === 'validate' && sessionId) {
      const data = await store.get(sessionId, { type: 'json' }) as SessionData | null
      if (data && data.expiresAt > Date.now()) {
        return { statusCode: 200, body: JSON.stringify({ valid: true, userId: data.userId }) }
      }
      return { statusCode: 401, body: JSON.stringify({ valid: false }) }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) }
  } catch (error: any) {
    console.error('Session manager error:', error.message)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}