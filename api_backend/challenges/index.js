import crypto from 'crypto'
import { createServiceClient } from '../lib/supabase.js'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const supabase = createServiceClient()

  // 1. GET /api/challenges - List or query challenges
  if (req.method === 'GET') {
    try {
      const { id, status = 'OPEN', limit = 50 } = req.query || {}

      let query = supabase
        .from('challenges')
        .select(`
          id,
          title,
          description,
          status,
          trl_stage,
          specification_id,
          adopted_by_org,
          adopted_by_faculty,
          created_at,
          updated_at,
          problem_specifications (
            id,
            title,
            domain,
            subdomain,
            location_description,
            observed_symptoms,
            measurable_objectives,
            human_verification_status
          )
        `)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit, 10))

      if (id) {
        query = query.eq('id', id)
      } else if (status && status !== 'ALL') {
        query = query.eq('status', status)
      }

      const { data: challenges, error } = await query

      if (error) {
        console.error('[API Challenges GET Error]:', error)
        res.status(500).json({ error: error.message })
        return
      }

      const formatted = (challenges || []).map((ch) => {
        const spec = ch.problem_specifications || {}
        return {
          id: ch.id,
          title: ch.title,
          challengeStatement: ch.description,
          status: ch.status === 'OPEN' ? 'Open' : ch.status,
          trl_stage: ch.trl_stage || 1,
          domain: spec.domain || 'Community Technology',
          locations: spec.location_description || 'Jharkhand',
          specification_id: ch.specification_id,
          objectives: spec.measurable_objectives || 'Field prototype development',
          proposalsCount: 0,
          created_at: ch.created_at,
        }
      })

      res.status(200).json({
        success: true,
        challenges: formatted,
      })
    } catch (err) {
      console.error('[API Challenges GET Exception]:', err)
      res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
    return
  }

  // 2. POST /api/challenges - Create new innovation challenge
  if (req.method === 'POST') {
    try {
      const {
        title,
        description,
        problem_statement,
        cluster_id,
        specification_id,
        domain = 'WATER QUALITY & SANITATION',
        target_locations = 'Jharkhand',
        trl_stage = 1,
      } = req.body || {}

      if (!title || (!description && !problem_statement)) {
        res.status(400).json({ error: 'title and description (or problem_statement) are required' })
        return
      }

      let targetSpecId = specification_id || null

      // If cluster_id was provided without specification_id, link or create specification
      if (!targetSpecId && cluster_id) {
        const { data: existingSpecs } = await supabase
          .from('problem_specifications')
          .select('id')
          .eq('cluster_id', cluster_id)
          .limit(1)

        if (existingSpecs && existingSpecs.length > 0) {
          targetSpecId = existingSpecs[0].id
        } else {
          // Create verified specification row
          const newSpecId = crypto.randomUUID()
          const { data: newSpec } = await supabase
            .from('problem_specifications')
            .insert({
              id: newSpecId,
              cluster_id: cluster_id,
              title: title,
              domain: domain,
              location_description: Array.isArray(target_locations) ? target_locations.join(', ') : target_locations,
              observed_symptoms: description || problem_statement,
              human_verification_status: 'VERIFIED',
              verified_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (newSpec) targetSpecId = newSpec.id
        }
      }

      const challengeId = crypto.randomUUID()
      const challengeDesc = description || problem_statement

      const { data: challengeRow, error: insertErr } = await supabase
        .from('challenges')
        .insert({
          id: challengeId,
          specification_id: targetSpecId,
          title: title,
          description: challengeDesc,
          status: 'OPEN',
          trl_stage: parseInt(trl_stage, 10) || 1,
        })
        .select()
        .single()

      if (insertErr) {
        console.error('[API Challenge Insert Error]:', insertErr)
        res.status(500).json({ error: insertErr.message })
        return
      }

      res.status(201).json({
        success: true,
        challenge: {
          id: challengeRow.id,
          title: challengeRow.title,
          description: challengeRow.description,
          status: 'Open',
          trl_stage: challengeRow.trl_stage,
          specification_id: challengeRow.specification_id,
          created_at: challengeRow.created_at,
        },
      })
    } catch (err) {
      console.error('[API Challenge POST Exception]:', err)
      res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
    return
  }

  res.status(405).json({ error: `Method ${req.method} not allowed` })
}
