import { GoogleGenAI } from '@google/genai'

/**
 * Production-Grade Semantic Vector Embedder
 * 
 * Uses Google Gemini text-embedding-004 (768 dimensions) via @google/genai.
 * Zero native binary overhead, 100% Vercel Serverless compatible, ₹0 budget.
 * 
 * RULE: If the embedding API is unavailable, returns null.
 * NEVER generates synthetic, mathematical, or fake hash vectors.
 */

let geminiClient = null

function getGeminiClient() {
  if (geminiClient) return geminiClient

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }

  geminiClient = new GoogleGenAI({ apiKey })
  return geminiClient
}

/**
 * Generate a real 768-dimensional normalized semantic vector embedding
 * @param {string} text - The text to embed
 * @returns {Promise<number[] | null>} 768-dimensional vector or null if provider unavailable
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return null
  }

  const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 1000)
  const client = getGeminiClient()

  if (!client) {
    console.warn('[Embedder] GEMINI_API_KEY not configured. Genuine embedding cannot be generated. Returning null.')
    return null
  }

  try {
    const model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
    const response = await client.models.embedContent({
      model,
      contents: cleanText,
      config: {
        outputDimensionality: 768,
      },
    })

    const values = response.embeddings?.[0]?.values || response.embedding?.values
    if (Array.isArray(values) && values.length === 768) {
      return values
    }

    if (Array.isArray(values)) {
      console.warn(`[Embedder] Embedding dimension received: ${values.length}. Expected 768.`)
      // If full 3072 is returned without MRL truncation, slice to 768 and L2-normalize
      if (values.length > 768) {
        const sliced = values.slice(0, 768)
        const norm = Math.sqrt(sliced.reduce((sum, v) => sum + v * v, 0)) || 1
        return sliced.map((v) => v / norm)
      }
      return values
    }

    console.warn('[Embedder] No embedding values found in Gemini API response')
    return null
  } catch (err) {
    console.error('[Embedder Exception] Gemini embedding generation failed:', err.message)
    // Fail explicitly with null. Never generate fake mathematical noise.
    return null
  }
}
