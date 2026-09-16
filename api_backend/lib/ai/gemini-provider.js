import { GoogleGenAI } from '@google/genai'
import { AIProvider } from './provider.js'
import { CIVIC_UNDERSTANDING_SYSTEM_PROMPT, buildCivicUserPrompt } from './prompts.js'

export class GeminiProvider extends AIProvider {
  constructor() {
    super('gemini', process.env.GEMINI_MODEL || 'gemini-3.6-flash')
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment')
    }
    this.client = new GoogleGenAI({ apiKey })
  }

  async understand(text, location = 'Jharkhand, India') {
    const userPrompt = buildCivicUserPrompt(text, location)

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [
          { role: 'user', parts: [{ text: `${CIVIC_UNDERSTANDING_SYSTEM_PROMPT}\n\n${userPrompt}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      })

      const rawText = response.text
      return this.parseJsonSafely(rawText, text, location)
    } catch (err) {
      console.warn(`[Gemini Provider Exception (${this.model})]:`, err.message)
      throw new Error(`Gemini LLM extraction failed: ${err.message}`)
    }
  }
}
