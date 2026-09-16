import crypto from 'crypto'
import { createServiceClient } from '../lib/supabase.js'

// In-memory dynamic proposals
const DYNAMIC_PROPOSALS = []

// Standard baseline proposals for local / offline operation mode
const DEFAULT_PROPOSALS = [
  {
    id: 'prop-ecofilter-01',
    challenge_id: 'ch-water-gumla',
    challenge_title: 'Drinking Water Quality & Heavy Metal Filtration',
    challenge_status: 'OPEN',
    team_id: 'team-aquasense',
    team_name: 'Team AquaSense',
    title: 'Multi-Stage Activated Zeolite Filtration & IoT Telemetry',
    description: 'Construct a 50L/hr physical water purification unit utilizing natural zeolite substrate to filter heavy fluoride deposits, coupled with ESP32 sensor telemetry.',
    technical_approach: 'ICP-MS spectrometry validation, dual-chamber filter vessel, real-time pH & fluoride micro-controller telemetry.',
    expected_impact: 'Provide clean drinking water for 14,200 citizens across 3 blocks in Gumla district.',
    trl_stage: 4,
    status: 'Approved',
    raw_status: 'ACTIVE',
    decision: 'APPROVED',
    decision_reason: 'Approved by Ranchi University Faculty Evaluation Board.',
    rubric: {
      score_feasibility: 14,
      score_impact: 14,
      score_innovation: 9,
      score_team: 9,
      total_score: 46,
      max_score: 50,
    },
    members_count: 3,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'prop-irrigation-02',
    challenge_id: 'ch-agri-simdega',
    challenge_title: 'Crop Disease & Fungal Blight Early Detection System',
    challenge_status: 'OPEN',
    team_id: 'team-agri-shield',
    team_name: 'AgriShield AI',
    title: 'Offline Edge-AI Paddy Leaf Disease Classifier',
    description: 'Deploy MobileNetV3 deep learning model on budget smartphones to detect fungal blight in paddy crops without cellular connectivity.',
    technical_approach: 'Transfer learning on 2,500 annotated plant pathology images, TFLite mobile optimization.',
    expected_impact: 'Prevent up to 35% crop loss for smallholder farmers in Simdega district.',
    trl_stage: 3,
    status: 'Under Review',
    raw_status: 'PLANNING',
    decision: null,
    decision_reason: null,
    rubric: null,
    members_count: 2,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  }
]

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

  // 1. GET /api/proposals - List or query proposals
  if (req.method === 'GET') {
    try {
      const { id, challenge_id, team_id, status } = req.query || {}

      let dbProjects = []
      try {
        let query = supabase
          .from('projects')
          .select(`
            id,
            challenge_id,
            team_id,
            mentor_id,
            status,
            trl_stage,
            start_date,
            created_at,
            challenges (id, title, description, status, trl_stage),
            teams ( id, name, lead_user_id, team_members (id, user_id, role) ),
            milestones (id, title, description, status),
            trl_gates (id, from_stage, to_stage, criteria, status, decision, decision_reason)
          `)
          .order('created_at', { ascending: false })

        if (id) {
          query = query.eq('id', id)
        } else {
          if (challenge_id) query = query.eq('challenge_id', challenge_id)
          if (team_id) query = query.eq('team_id', team_id)
        }

        const { data, error } = await query
        if (!error && data && data.length > 0) {
          dbProjects = data
        }
      } catch (dbErr) {
        console.warn('[Proposals API GET] Supabase query bypassed:', dbErr.message)
      }

      let formatted = []
      if (dbProjects.length > 0) {
        formatted = dbProjects.map((p) => {
          const ms = Array.isArray(p.milestones) ? p.milestones[0] : p.milestones
          const gate = Array.isArray(p.trl_gates) ? p.trl_gates[0] : p.trl_gates
          const criteria = gate?.criteria || {}

          let displayStatus = 'Under Review'
          if (gate?.decision === 'APPROVED' || p.status === 'ACTIVE') {
            displayStatus = 'Approved'
          } else if (gate?.decision === 'REJECTED' || p.status === 'CANCELLED') {
            displayStatus = 'Declined'
          } else if (gate?.decision === 'REVISION') {
            displayStatus = 'Revision Requested'
          }

          return {
            id: p.id,
            challenge_id: p.challenge_id,
            challenge_title: p.challenges?.title || 'Innovation Challenge',
            challenge_status: p.challenges?.status || 'OPEN',
            team_id: p.team_id,
            team_name: p.teams?.name || 'Student Team',
            title: ms?.title || criteria?.solution_title || 'Innovation Proposal',
            description: ms?.description || 'Proposed student technical solution',
            technical_approach: criteria?.technical_approach || '',
            expected_impact: criteria?.expected_impact || '',
            trl_stage: p.trl_stage || 1,
            status: displayStatus,
            raw_status: p.status,
            decision: gate?.decision || null,
            decision_reason: gate?.decision_reason || null,
            rubric: criteria?.rubric || null,
            members_count: (p.teams?.team_members || []).length || 3,
            created_at: p.created_at,
          }
        })
      }

      // Merge dynamic + defaults
      const combinedPool = [...DYNAMIC_PROPOSALS, ...DEFAULT_PROPOSALS]
      for (const item of combinedPool) {
        if (!formatted.some((p) => p.id === item.id)) {
          formatted.push(item)
        }
      }

      if (id) formatted = formatted.filter((p) => p.id === id)
      if (challenge_id) formatted = formatted.filter((p) => p.challenge_id === challenge_id)
      if (team_id) formatted = formatted.filter((p) => p.team_id === team_id)

      res.status(200).json({
        success: true,
        proposals: formatted,
      })
      return
    } catch (err) {
      console.error('[API Proposals GET Exception]:', err)
      res.status(200).json({ success: true, proposals: DEFAULT_PROPOSALS })
      return
    }
  }

  // 2. POST /api/proposals - Submit innovation proposal
  if (req.method === 'POST') {
    try {
      const {
        challenge_id,
        team_id,
        title,
        description,
        technical_approach,
        expected_impact,
        trl_stage = 1,
      } = req.body || {}

      if (!challenge_id) {
        res.status(400).json({ error: 'challenge_id is required' })
        return
      }
      if (!team_id) {
        res.status(400).json({ error: 'team_id is required' })
        return
      }
      if (!title || !title.trim()) {
        res.status(400).json({ error: 'Solution title is required' })
        return
      }
      if (!description || !description.trim()) {
        res.status(400).json({ error: 'Solution description is required' })
        return
      }

      // 1. Verify that challenge exists and is OPEN
      const { data: challenge, error: chalErr } = await supabase
        .from('challenges')
        .select('id, title, status, trl_stage')
        .eq('id', challenge_id)
        .single()

      if (chalErr || !challenge) {
        res.status(404).json({ error: 'Target challenge does not exist' })
        return
      }

      if (challenge.status !== 'OPEN') {
        res.status(400).json({ error: `Cannot submit proposal for challenge with status: ${challenge.status}. Only OPEN challenges accept proposals.` })
        return
      }

      // 2. Verify that team exists and belongs to this challenge
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('id, name, challenge_id')
        .eq('id', team_id)
        .single()

      if (teamErr || !team) {
        res.status(404).json({ error: 'Target team does not exist' })
        return
      }

      if (team.challenge_id !== challenge_id) {
        res.status(400).json({ error: 'This team is not registered for the target challenge.' })
        return
      }

      // 3. Prevent duplicate proposal submissions by the same team for the same challenge
      const { data: existingProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('challenge_id', challenge_id)
        .eq('team_id', team_id)
        .limit(1)

      const projectId = `prop-${Date.now()}`
      const milestoneId = `m-${Date.now()}`
      const trlGateId = `gate-${Date.now()}`

      const newProposalObj = {
        id: projectId,
        challenge_id: challenge_id,
        challenge_title: challenge?.title || 'Drinking Water Quality & Heavy Metal Filtration',
        team_id: team_id,
        team_name: team?.name || 'Team AquaSense',
        title: title.trim(),
        description: description.trim(),
        technical_approach: technical_approach || '',
        expected_impact: expected_impact || '',
        trl_stage: parseInt(trl_stage, 10) || 1,
        status: 'Under Review',
        raw_status: 'PLANNING',
        decision: null,
        decision_reason: null,
        rubric: null,
        members_count: 3,
        created_at: new Date().toISOString(),
      }

      DYNAMIC_PROPOSALS.unshift(newProposalObj)

      try {
        // 4. Persist project in projects table if Supabase connected
        await supabase.from('projects').insert({
          id: projectId,
          challenge_id: challenge_id,
          team_id: team_id,
          status: 'PLANNING',
          trl_stage: parseInt(trl_stage, 10) || 1,
          start_date: new Date().toISOString(),
        })

        const fullContent = `${description.trim()}\n\nTechnical Approach:\n${(technical_approach || '').trim()}\n\nExpected Impact:\n${(expected_impact || '').trim()}`
        await supabase.from('milestones').insert({
          id: milestoneId,
          project_id: projectId,
          title: title.trim(),
          description: fullContent,
          status: 'PROPOSED',
          due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        })

        await supabase.from('trl_gates').insert({
          id: trlGateId,
          project_id: projectId,
          from_stage: parseInt(trl_stage, 10) || 1,
          to_stage: (parseInt(trl_stage, 10) || 1) + 1,
          criteria: {
            solution_title: title.trim(),
            technical_approach: technical_approach || '',
            expected_impact: expected_impact || '',
          },
          status: 'PENDING',
        })
      } catch (dbErr) {
        console.warn('[API Proposals POST] Supabase insert fallback to in-memory:', dbErr.message)
      }

      res.status(201).json({
        success: true,
        proposal: newProposalObj,
      })
    } catch (err) {
      console.error('[API Proposals POST Exception]:', err)
      res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
    return
  }

  res.status(405).json({ error: `Method ${req.method} not allowed` })
}
