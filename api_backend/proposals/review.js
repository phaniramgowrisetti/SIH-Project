import crypto from 'crypto'
import { createServiceClient } from '../lib/supabase.js'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,PATCH,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    res.status(405).json({ error: `Method ${req.method} not allowed` })
    return
  }

  try {
    const {
      proposal_id,
      id,
      decision = 'APPROVED', // 'APPROVED' | 'REJECTED' | 'REVISION'
      decision_reason = '',
      reviewer_id = null,
      score_feasibility,
      score_impact,
      score_innovation,
      score_team,
    } = req.body || {}

    const targetProjectId = proposal_id || id

    if (!targetProjectId) {
      res.status(400).json({ error: 'proposal_id is required' })
      return
    }

    const validDecisions = ['APPROVED', 'REJECTED', 'REVISION']
    const upperDecision = decision.toUpperCase()
    if (!validDecisions.includes(upperDecision)) {
      res.status(400).json({ error: `Invalid decision: ${decision}. Must be one of: ${validDecisions.join(', ')}` })
      return
    }

    // Phase 9 50-Point Rubric Validation:
    // Feasibility: 0 - 15
    // Impact: 0 - 15
    // Innovation: 0 - 10
    // Team: 0 - 10
    // Total: 0 - 50
    let rubric = null
    if (
      score_feasibility !== undefined ||
      score_impact !== undefined ||
      score_innovation !== undefined ||
      score_team !== undefined
    ) {
      const numFeas = Number(score_feasibility)
      const numImpact = Number(score_impact)
      const numInno = Number(score_innovation)
      const numTeam = Number(score_team)

      if (isNaN(numFeas) || numFeas < 0 || numFeas > 15) {
        res.status(400).json({ error: 'score_feasibility must be a number between 0 and 15' })
        return
      }
      if (isNaN(numImpact) || numImpact < 0 || numImpact > 15) {
        res.status(400).json({ error: 'score_impact must be a number between 0 and 15' })
        return
      }
      if (isNaN(numInno) || numInno < 0 || numInno > 10) {
        res.status(400).json({ error: 'score_innovation must be a number between 0 and 10' })
        return
      }
      if (isNaN(numTeam) || numTeam < 0 || numTeam > 10) {
        res.status(400).json({ error: 'score_team must be a number between 0 and 10' })
        return
      }

      const totalScore = numFeas + numImpact + numInno + numTeam
      rubric = {
        score_feasibility: numFeas,
        score_impact: numImpact,
        score_innovation: numInno,
        score_team: numTeam,
        total_score: totalScore,
        max_score: 50,
      }
    } else if (upperDecision === 'APPROVED') {
      // Default approved baseline rubric if not specified
      rubric = {
        score_feasibility: 14,
        score_impact: 14,
        score_innovation: 9,
        score_team: 9,
        total_score: 46,
        max_score: 50,
      }
    }

    const supabase = createServiceClient()

    // 1. Fetch project and challenge
    let project = null
    try {
      const { data, error: projErr } = await supabase
        .from('projects')
        .select('id, challenge_id, team_id, status, trl_stage')
        .eq('id', targetProjectId)
        .single()
      if (!projErr && data) {
        project = data
      }
    } catch (dbErr) {
      console.warn('[Proposal Review] Supabase query bypassed:', dbErr.message)
    }

    if (!project) {
      // Local fallback project reference for demo proposals
      project = {
        id: targetProjectId,
        challenge_id: 'ch-water-gumla',
        team_id: 'team-aquasense',
        status: 'PENDING',
        trl_stage: 2,
      }
    }

    // 2. Update TRL gate evaluation with rubric and decision
    const gateStatus = upperDecision === 'APPROVED' ? 'PASSED' : upperDecision === 'REJECTED' ? 'FAILED' : 'PENDING'

    // Fetch existing criteria
    const { data: existingGate } = await supabase
      .from('trl_gates')
      .select('criteria')
      .eq('project_id', targetProjectId)
      .single()

    const updatedCriteria = {
      ...(existingGate?.criteria || {}),
      ...(rubric ? { rubric } : {}),
    }

    const { error: gateErr } = await supabase
      .from('trl_gates')
      .update({
        decision: upperDecision,
        decision_reason: decision_reason || (upperDecision === 'APPROVED' ? 'Evaluated and approved by university mentor.' : 'Revision requested.'),
        criteria: updatedCriteria,
        status: gateStatus,
        reviewer_id: reviewer_id || undefined,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', targetProjectId)

    if (gateErr) {
      console.error('[API Proposal Review Gate Error]:', gateErr)
    }

    // 3. Update project status
    let nextProjectStatus = project.status
    if (upperDecision === 'APPROVED') {
      nextProjectStatus = 'ACTIVE'
    } else if (upperDecision === 'REJECTED') {
      nextProjectStatus = 'CANCELLED'
    }

    const { data: updatedProject, error: updateErr } = await supabase
      .from('projects')
      .update({
        status: nextProjectStatus,
        mentor_id: reviewer_id || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetProjectId)
      .select()
      .single()

    if (updateErr) {
      console.error('[API Proposal Review Project Error]:', updateErr)
      res.status(500).json({ error: updateErr.message })
      return
    }

    // 4. If approved, advance challenge status to 'MATCHING' and initialize project milestones
    if (upperDecision === 'APPROVED') {
      await supabase
        .from('challenges')
        .update({
          status: 'MATCHING',
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.challenge_id)

      // Fetch existing milestones
      const { data: initialMilestones } = await supabase
        .from('milestones')
        .select('id, title, status')
        .eq('project_id', targetProjectId)

      if (initialMilestones && initialMilestones.length === 1) {
        // Upgrade initial proposal submission to Phase 1 (Completed upon approval)
        await supabase
          .from('milestones')
          .update({
            title: `Phase 1: Field Research & Problem Specification (${initialMilestones[0].title})`,
            status: 'COMPLETED',
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialMilestones[0].id)

        const now = Date.now()
        const day = 24 * 60 * 60 * 1000

        const milestonesToSeed = [
          {
            id: crypto.randomUUID(),
            project_id: targetProjectId,
            title: 'Phase 2: MVP Prototype Design & Lab Assembly',
            description: 'Engineering and fabrication of functional benchtop prototype model.',
            status: 'IN_PROGRESS',
            due_date: new Date(now + 30 * day).toISOString(),
          },
          {
            id: crypto.randomUUID(),
            project_id: targetProjectId,
            title: 'Phase 3: Field Pilot Testing in Rural Community',
            description: 'Deploy prototype in rural pilot cluster to evaluate durability and operational efficiency.',
            status: 'PENDING',
            due_date: new Date(now + 45 * day).toISOString(),
          },
          {
            id: crypto.randomUUID(),
            project_id: targetProjectId,
            title: 'Phase 4: Community Deployment & Handover',
            description: 'Final deployment, operational maintenance handover, and impact telemetry verification.',
            status: 'PENDING',
            due_date: new Date(now + 60 * day).toISOString(),
          },
        ]

        await supabase.from('milestones').insert(milestonesToSeed)
      }
    }

    res.status(200).json({
      success: true,
      decision: upperDecision,
      decision_reason: decision_reason,
      status: nextProjectStatus,
      rubric: rubric,
      project: updatedProject,
    })
  } catch (err) {
    console.error('[API Proposal Review Exception]:', err)
    res.status(500).json({ error: err.message || 'Failed to review proposal' })
  }
}
