import { understandCivicIssue, generateEmbedding } from '../lib/ai/index.js'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: `Method ${req.method} not allowed` })
    return
  }

  try {
    const { text, location = 'Jharkhand, India', autoEmbed = true } = req.body || {}

    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      res.status(400).json({ error: 'Valid complaint text (min 3 chars) is required' })
      return
    }

    // 1. Structured Civic Extraction via Provider-Agnostic AI
    const understanding = await understandCivicIssue(text, location)

    // 2. Generate 768-dim semantic embedding if requested
    let embedding = null
    if (autoEmbed) {
      const textToEmbed = `${understanding.primaryDomain}: ${understanding.issueSummary}`
      embedding = await generateEmbedding(textToEmbed)
    }

    res.status(200).json({
      success: true,
      understanding,
      embedding,
      meta: {
        timestamp: new Date().toISOString(),
        provider: understanding.ai_provider,
        model: understanding.ai_model,
        vectorDimensions: embedding ? embedding.length : 0,
      },
    })
  } catch (err) {
    console.error('[API Understand Exception]:', err)
    res.status(500).json({
      error: err.message || 'Civic issue understanding failed',
    })
  }
}
