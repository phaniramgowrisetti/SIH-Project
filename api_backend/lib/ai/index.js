import { GroqProvider } from './groq-provider.js'
import { GeminiProvider } from './gemini-provider.js'
import { generateEmbedding } from './embedder.js'

/**
 * Instantiate the primary AI Provider according to environment configuration
 */
export function getAIProvider() {
  const preferred = (process.env.AI_LLM_PROVIDER || 'groq').toLowerCase()

  if (preferred === 'groq' && process.env.GROQ_API_KEY) {
    try {
      return new GroqProvider()
    } catch (e) {
      console.warn('[AI Factory] GroqProvider init failed:', e.message)
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      return new GeminiProvider()
    } catch (e) {
      console.warn('[AI Factory] GeminiProvider init failed:', e.message)
    }
  }

  // Fallback to Groq if key exists
  if (process.env.GROQ_API_KEY) {
    try {
      return new GroqProvider()
    } catch (e) {}
  }

  return null
}

/**
 * Resilient Issue Understanding with Instant Failover
 * 
 * Pipeline: Groq Llama 3.3 70B (Primary) -> Google Gemini 2.0 Flash (Fallback) -> Deterministic NLP Rule Engine
 */
export async function understandCivicIssue(text, location = 'Jharkhand, India') {
  if (!text || typeof text !== 'string') {
    throw new Error('Valid complaint text is required for AI understanding')
  }

  const primary = getAIProvider()

  // 1. Try Primary Provider (Groq)
  if (primary) {
    try {
      const result = await primary.understand(text, location)
      return {
        ...result,
        ai_provider: primary.name,
        ai_model: primary.model,
        success: true,
      }
    } catch (primaryErr) {
      console.warn(`[AI Warning] Primary ${primary.name} failed (${primaryErr.message}). Switching to fallback.`);
      
      // 2. Try Fallback Provider (Gemini)
      if (primary.name === 'groq' && process.env.GEMINI_API_KEY) {
        try {
          const fallback = new GeminiProvider()
          const result = await fallback.understand(text, location)
          return {
            ...result,
            ai_provider: fallback.name,
            ai_model: fallback.model,
            success: true,
          }
        } catch (fallbackErr) {
          console.warn('[AI Warning] Gemini fallback also failed:', fallbackErr.message)
        }
      }
    }
  }

  // 3. Resilient Offline Deterministic Rule Engine
  console.info('[AI Pipeline] Running deterministic rule fallback engine.')
  const fallbackResult = parseDeterministicRules(text, location)
  return {
    ...fallbackResult,
    ai_provider: 'rule-based-fallback',
    ai_model: 'heuristic-v1',
    success: true,
  }
}

/**
 * Rule-based fallback parser for offline/development environments
 */
function parseDeterministicRules(text, location) {
  const lower = text.toLowerCase()
  let primaryDomain = 'Water Quality & Sanitation'
  let relatedDomains = ['Healthcare & Public Health']
  let issueSummary = 'Observed water quality variation or contamination risk in community water source.'
  let affectedGroups = ['Local Families', 'Children']
  let possibleImpacts = ['Drinking water contamination', 'Waterborne illness risk']
  let severity = 'high'
  const infrastructure = []
  const symptoms = []

  if (lower.includes('road') || lower.includes('bridge') || lower.includes('submerge') || lower.includes('connectivity') || lower.includes('transport')) {
    primaryDomain = 'Rural Infrastructure & Connectivity'
    relatedDomains = ['Public Safety', 'Monsoon Access']
    issueSummary = 'Road, bridge, or culvert accessibility disruption during seasonal weather.'
    affectedGroups = ['Commuters', 'School Students', 'Local Farmers']
    possibleImpacts = ['Isolated village connectivity', 'Delayed emergency transit']
    severity = 'medium'
    infrastructure.push('Road', 'Bridge')
  } else if (lower.includes('crop') || lower.includes('farmer') || lower.includes('canal') || lower.includes('soil') || lower.includes('paddy')) {
    primaryDomain = 'Agriculture & Irrigation'
    relatedDomains = ['Soil Degradation', 'Monsoon Drainage']
    issueSummary = 'Agricultural damage, irrigation channel siltation, or fast-spreading crop disease.'
    affectedGroups = ['Smallholder Farmers', 'Agricultural Laborers']
    possibleImpacts = ['Severe crop yield loss', 'Farmland erosion']
    severity = 'high'
    infrastructure.push('Irrigation Canal')
    symptoms.push('Crop Damage')
  } else if (lower.includes('doctor') || lower.includes('hospital') || lower.includes('medicine') || lower.includes('fever') || lower.includes('health')) {
    primaryDomain = 'Healthcare & Public Health'
    relatedDomains = ['Epidemic Prevention', 'Clean Water']
    issueSummary = 'Healthcare service disruption or community health symptoms in local hamlets.'
    affectedGroups = ['Children', 'Elderly Villagers', 'Mothers']
    possibleImpacts = ['Public health outbreak risk', 'Urgent medical supply deficit']
    severity = 'critical'
    infrastructure.push('Primary Health Center')
  } else if (lower.includes('solar') || lower.includes('power') || lower.includes('electricity') || lower.includes('battery')) {
    primaryDomain = 'Renewable Energy & Power'
    relatedDomains = ['Community Infrastructure']
    issueSummary = 'Solar micro-grid or electrical supply disruption in rural community.'
    affectedGroups = ['Villagers', 'Students']
    possibleImpacts = ['Night darkness', 'Inability to power medical or water equipment']
    severity = 'medium'
    infrastructure.push('Solar Grid')
  } else {
    infrastructure.push('Hand pump', 'Borewell')
    symptoms.push('Water Discoloration')
  }

  return {
    primaryDomain,
    relatedDomains,
    issueSummary,
    affectedGroups,
    possibleImpacts,
    severity,
    entities: {
      locations: [location || 'Gumla, Jharkhand'],
      infrastructure,
      symptoms,
    },
  }
}

export { generateEmbedding }
