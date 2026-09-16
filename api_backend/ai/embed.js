import { generateEmbedding } from '../lib/ai/embedder.js'

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
    const { text, texts } = req.body || {}

    if (Array.isArray(texts)) {
      // Batch embedding
      const embeddings = await Promise.all(texts.map((t) => generateEmbedding(t)))
      const validEmbeddings = embeddings.filter(Boolean)
      res.status(200).json({
        success: validEmbeddings.length > 0,
        embeddings,
        available: validEmbeddings.length > 0,
        dimensions: 768,
        count: embeddings.length,
        model: 'text-embedding-004',
      })
      return
    }

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text string or texts array is required' })
      return
    }

    const embedding = await generateEmbedding(text)

    if (!embedding) {
      res.status(200).json({
        success: false,
        embedding: null,
        available: false,
        dimensions: 768,
        message: 'Embedding unavailable. GEMINI_API_KEY is not configured or rate-limited.',
      })
      return
    }

    res.status(200).json({
      success: true,
      embedding,
      available: true,
      dimensions: embedding.length,
      model: 'text-embedding-004 (Google Gemini)',
    })
  } catch (err) {
    console.error('[API Embed Exception]:', err)
    res.status(500).json({
      error: err.message || 'Vector embedding generation failed',
    })
  }
}
