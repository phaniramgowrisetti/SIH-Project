import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function ensureEnvLoaded() {
  if (!process.env.SUPABASE_SERVICE_KEY) {
    try {
      const envPath = path.resolve(process.cwd(), '.env')
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8')
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/)
          if (match) {
            const k = match[1]
            let v = (match[2] || '').trim()
            if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
            if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1)
            process.env[k] = process.env[k] || v
          }
        }
      }
    } catch {}
  }
}

/**
 * Create a Supabase client for server-side API routes.
 * Uses the service role key for full database access (bypasses RLS).
 */
export function createServiceClient() {
  ensureEnvLoaded()
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create a Supabase client that respects the user's JWT (RLS-enforced).
 * Pass the Authorization header from the incoming request.
 */
export function createUserClient(authHeader) {
  ensureEnvLoaded()
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  
  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
  }
  
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })
}

/**
 * Generate a unique reference ID
 * Format: PREFIX-YEAR-NNNNN
 */
export function generateRefId(prefix = 'SS') {
  const year = new Date().getFullYear()
  const random = Math.floor(10000 + Math.random() * 90000)
  return `${prefix}-${year}-${random}`
}
