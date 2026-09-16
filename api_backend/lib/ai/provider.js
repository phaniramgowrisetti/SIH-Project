/**
 * Abstract Base Class for AI Providers
 */
export class AIProvider {
  constructor(name, model) {
    this.name = name
    this.model = model
  }

  /**
   * Understand unstructured civic issue text and extract structured JSON.
   * @param {string} text - The raw citizen report text
   * @param {string} location - Location label / district
   * @returns {Promise<Object>} Structured civic issue payload
   */
  async understand(text, location) {
    throw new Error('understand() must be implemented by subclass')
  }

  /**
   * Parse raw LLM output safely, stripping any markdown code fences
   */
  parseJsonSafely(rawContent, rawText, location) {
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Empty or invalid response from LLM')
    }

    // Strip markdown code fences if model included them
    let cleaned = rawContent.trim()
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '')
    cleaned = cleaned.replace(/\s*```$/, '')
    cleaned = cleaned.trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (err) {
      // Attempt to extract JSON from surrounding text
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      } else {
        throw new Error(`Failed to parse LLM JSON response: ${err.message}`)
      }
    }

    return this.sanitizeOutput(parsed, rawText, location)
  }

  /**
   * Validate and sanitize structured AI output
   */
  sanitizeOutput(data, rawText, location) {
    return {
      primaryDomain: data.primaryDomain || 'Other Civic Issue',
      relatedDomains: Array.isArray(data.relatedDomains) ? data.relatedDomains : [],
      issueSummary: data.issueSummary || rawText.slice(0, 120),
      affectedGroups: Array.isArray(data.affectedGroups) && data.affectedGroups.length > 0
        ? data.affectedGroups
        : ['Local Community'],
      possibleImpacts: Array.isArray(data.possibleImpacts) && data.possibleImpacts.length > 0
        ? data.possibleImpacts
        : ['Community concern requiring inspection'],
      severity: ['low', 'medium', 'high', 'critical'].includes(data.severity)
        ? data.severity
        : 'medium',
      entities: {
        locations: Array.isArray(data.entities?.locations) ? data.entities.locations : [location || 'Jharkhand'],
        infrastructure: Array.isArray(data.entities?.infrastructure) ? data.entities.infrastructure : [],
        symptoms: Array.isArray(data.entities?.symptoms) ? data.entities.symptoms : [],
      },
    }
  }
}
