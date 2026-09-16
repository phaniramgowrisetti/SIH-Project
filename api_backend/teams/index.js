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

  // 1. GET /api/teams - List or query teams
  if (req.method === 'GET') {
    try {
      const { id, challenge_id, user_id } = req.query || {}

      let query = supabase
        .from('teams')
        .select(`
          id,
          name,
          challenge_id,
          lead_user_id,
          created_at,
          updated_at,
          challenges (id, title, status, trl_stage),
          team_members (
            id,
            user_id,
            role,
            created_at,
            users (id, email, role)
          )
        `)
        .order('created_at', { ascending: false })

      if (id) {
        query = query.eq('id', id)
      } else if (challenge_id) {
        query = query.eq('challenge_id', challenge_id)
      }

      const { data: teams, error } = await query

      if (error) {
        console.error('[API Teams GET Error]:', error)
        res.status(500).json({ error: error.message })
        return
      }

      let filteredTeams = teams || []
      if (user_id) {
        filteredTeams = filteredTeams.filter(t =>
          t.lead_user_id === user_id ||
          (t.team_members || []).some(m => m.user_id === user_id)
        )
      }

      const formatted = filteredTeams.map(t => ({
        id: t.id,
        name: t.name,
        challenge_id: t.challenge_id,
        challenge_title: t.challenges?.title || 'Innovation Challenge',
        challenge_status: t.challenges?.status || 'OPEN',
        lead_user_id: t.lead_user_id,
        members_count: (t.team_members || []).length,
        members: (t.team_members || []).map(m => ({
          id: m.id,
          user_id: m.user_id,
          email: m.users?.email || 'student@samadhansetu.in',
          role: m.role || 'MEMBER',
        })),
        created_at: t.created_at,
      }))

      res.status(200).json({
        success: true,
        teams: formatted,
      })
    } catch (err) {
      console.error('[API Teams GET Exception]:', err)
      res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
    return
  }

  // 2. POST /api/teams - Create a new team
  if (req.method === 'POST') {
    try {
      const { name, challenge_id, lead_user_id } = req.body || {}

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Team name is required' })
        return
      }
      if (!challenge_id) {
        res.status(400).json({ error: 'challenge_id is required' })
        return
      }

      // 1. Verify that challenge exists and is OPEN
      const { data: challenge, error: chalErr } = await supabase
        .from('challenges')
        .select('id, title, status')
        .eq('id', challenge_id)
        .single()

      if (chalErr || !challenge) {
        res.status(404).json({ error: 'Target challenge does not exist' })
        return
      }

      if (challenge.status !== 'OPEN') {
        res.status(400).json({ error: `Cannot form team for challenge with status: ${challenge.status}. Only OPEN challenges accept teams.` })
        return
      }

      // Determine valid user ID for team lead (reuse existing or fallback to student user)
      let finalLeadUserId = lead_user_id

      if (!finalLeadUserId) {
        // Find existing researcher / citizen user or get the first user
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .limit(1)
          .single()
        finalLeadUserId = userRow?.id
      }

      if (!finalLeadUserId) {
        res.status(400).json({ error: 'Valid user ID required to lead a team' })
        return
      }

      // 2. Prevent duplicate team by name or same lead for the same challenge
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id, name, lead_user_id')
        .eq('challenge_id', challenge_id)
        .or(`name.ilike.${name.trim()},lead_user_id.eq.${finalLeadUserId}`)
        .limit(1)

      if (existingTeam && existingTeam.length > 0) {
        const match = existingTeam[0]
        if (match.name.toLowerCase() === name.trim().toLowerCase()) {
          res.status(409).json({ error: `A team named "${name.trim()}" already exists for this challenge.` })
          return
        }
        if (match.lead_user_id === finalLeadUserId) {
          res.status(409).json({ error: 'You are already leading a team for this challenge.' })
          return
        }
      }

      const teamId = crypto.randomUUID()

      // 3. Insert team
      const { data: newTeam, error: teamErr } = await supabase
        .from('teams')
        .insert({
          id: teamId,
          name: name.trim(),
          challenge_id: challenge_id,
          lead_user_id: finalLeadUserId,
        })
        .select()
        .single()

      if (teamErr) {
        console.error('[API Teams Insert Error]:', teamErr)
        res.status(500).json({ error: teamErr.message })
        return
      }

      // 4. Automatically insert lead user into team_members
      const memberId = crypto.randomUUID()
      const { error: memberErr } = await supabase
        .from('team_members')
        .insert({
          id: memberId,
          team_id: teamId,
          user_id: finalLeadUserId,
          role: 'LEAD',
        })

      if (memberErr) {
        console.error('[API Team Lead Member Insert Error]:', memberErr)
      }

      res.status(201).json({
        success: true,
        team: {
          id: newTeam.id,
          name: newTeam.name,
          challenge_id: newTeam.challenge_id,
          lead_user_id: newTeam.lead_user_id,
          members: [
            {
              id: memberId,
              user_id: finalLeadUserId,
              role: 'LEAD',
            }
          ],
          created_at: newTeam.created_at,
        },
      })
    } catch (err) {
      console.error('[API Teams POST Exception]:', err)
      res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
    return
  }

  res.status(405).json({ error: `Method ${req.method} not allowed` })
}
