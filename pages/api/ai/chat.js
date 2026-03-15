import { withAuth } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'
import { runAgent } from '../../../lib/agent'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id: userId, role } = req.user

  try {
    const { message, conversationHistory = [] } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const userContext = { userId, role }

    const { response, toolCallLog } = await runAgent(
      message.trim(),
      conversationHistory,
      userContext
    )

    // Log to DB (best effort)
    supabaseAdmin.from('ai_chat_logs').insert({
      user_id: userId,
      role,
      message: message.substring(0, 1000),
      response: response.substring(0, 2000),
    }).catch(console.error)

    return res.status(200).json({ response, toolCallLog })
  } catch (err) {
    const status = err?.status ?? err?.error?.status
    const message = err?.message ?? err?.error?.message
    console.error('Agent error:', status, message || err)

    if (status === 429) {
      return res.status(429).json({ error: 'AI rate limit reached. Please wait a moment and try again.' })
    }

    if (status === 401) {
      return res.status(500).json({ error: 'Invalid GROQ_API_KEY. Please check your environment variables.' })
    }

    if (status === 400 || status === 422) {
      return res.status(500).json({ error: `AI model error: ${message || 'Bad request'}` })
    }

    return res.status(500).json({
      error: 'AI agent failed. Please try again.',
      detail: message || String(err)
    })
  }
}

export default withAuth(handler)
