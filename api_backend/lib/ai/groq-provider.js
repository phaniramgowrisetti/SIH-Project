import Groq from 'groq-sdk'
import { AIProvider } from './provider.js'
import { CIVIC_UNDERSTANDING_SYSTEM_PROMPT, buildCivicUserPrompt } from './prompts.js'

export class GroqProvider extends AIProvider {
  constructor() {
    super('groq', process.env.GROQ_MODEL || 'openai/gpt-oss-120b')
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured in environment')
    }
    this.client = new Groq({ apiKey })
  }

  async understand(text, location = 'Jharkhand, India') {
    const userPrompt = buildCivicUserPrompt(text, location)

    const messages = [
      { role: 'system', content: CIVIC_UNDERSTANDING_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1024,
      })

      const rawContent = completion.choices[0]?.message?.content
      return this.parseJsonSafely(rawContent, text, location)
    } catch (primaryErr) {
      console.warn(`[Groq Primary ${this.model} Failed]:`, primaryErr.message)
      
      // Fallback to fast qwen3.8-27b model if flagship hit rate limits
      if (this.model !== 'qwen/qwen3.8-27b') {
        try {
          const fallbackCompletion = await this.client.chat.completions.create({
            model: 'qwen/qwen3.8-27b',
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 1024,
          })
          const fallbackContent = fallbackCompletion.choices[0]?.message?.content
          return this.parseJsonSafely(fallbackContent, text, location)
        } catch (secondaryErr) {
          throw new Error(`Groq LLM extraction failed on both primary and fallback models: ${secondaryErr.message}`)
        }
      }
      throw primaryErr
    }
  }
}
