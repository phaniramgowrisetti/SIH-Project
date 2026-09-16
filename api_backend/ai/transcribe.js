import Groq from 'groq-sdk'

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
    const { audioBase64, mimeType = 'audio/webm', language = 'hi' } = req.body || {}

    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 data is required for transcription' })
      return
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.warn('[Transcription] GROQ_API_KEY not configured. Returning fallback response.')
      res.status(200).json({
        text: 'Hand pump water is yellow and children are falling sick.',
        provider: 'offline-fallback',
        language,
      })
      return
    }

    const groq = new Groq({ apiKey })

    // Convert Base64 string to Buffer and File-like object
    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '')
    const audioBuffer = Buffer.from(cleanBase64, 'base64')

    const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    const fileName = `speech_${Date.now()}.${extension}`

    // Create a Blob/File compatible object for groq-sdk
    const file = new File([audioBuffer], fileName, { type: mimeType })

    // Map language code (hi -> hi, en -> en, te -> te)
    const whisperLang = language ? language.split('-')[0].toLowerCase() : 'hi'

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language: whisperLang,
      response_format: 'json',
      temperature: 0.0,
    })

    res.status(200).json({
      success: true,
      text: transcription.text || '',
      provider: 'groq-whisper-turbo',
      language: whisperLang,
    })
  } catch (err) {
    console.error('[API Transcribe Exception]:', err)
    res.status(500).json({
      error: err.message || 'Speech transcription failed',
      provider: 'groq',
    })
  }
}
