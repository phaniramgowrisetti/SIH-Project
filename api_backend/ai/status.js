import { getAIProvider } from '../lib/ai/index.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const primary = getAIProvider()

  res.status(200).json({
    status: 'ok',
    llm: {
      activeProvider: primary?.name || 'rule-based-fallback',
      activeModel: primary?.model || 'heuristic-v1',
      hasGroqKey: !!process.env.GROQ_API_KEY,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    },
    embeddings: {
      engine: 'Google Gemini gemini-embedding-001',
      model: 'gemini-embedding-001',
      dimensions: 768,
      isConfigured: !!process.env.GEMINI_API_KEY,
    },
    transcription: {
      engine: 'groq-whisper-turbo',
      isReady: !!process.env.GROQ_API_KEY,
    },
    timestamp: new Date().toISOString(),
  })
}
