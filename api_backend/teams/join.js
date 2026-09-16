import crypto from 'crypto'
import { createServiceClient } from '../lib/supabase.js'

export default async function handler(req, res) {
  // CORS
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
    const { team_id, user_id, role = 'MEMBER' } = req.body || {}

    if (!team_id) {
      res.status(400).json({ error: 'team_id is required' })
      return
    }
    if (!user_id) {
      res.status(400).json({ error: 'user_id is required' })
      return
    }

    const supabase = createServiceClient()

    // 1. Fetch team and its challenge
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .select('id, name, challenge_id, challenges (id, title, status)')
      .eq('id', team_id)
      .single()

    if (teamErr || !team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    if (team.challenges?.status !== 'OPEN') {
      res.status(400).json({ error: `Cannot join team for challenge with status: ${team.challenges?.status}. Only OPEN challenges accept team members.` })
      return
    }

    // 2. Check if user is already a member of this team
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('team_id', team_id)
      .eq('user_id', user_id)
      .limit(1)

    if (existingMember && existingMember.length > 0) {
      res.status(409).json({ error: 'User is already a member of this team.' })
      return
    }

    // 3. Check if user is already in another team for this same challenge
    const { data: userOtherTeams } = await supabase
      .from('team_members')
      .select(`
        id,
        team_id,
        teams!inner (
          id,
          challenge_id
        )
      `)
      .eq('user_id', user_id)
      .eq('teams.challenge_id', team.challenge_id)
      .limit(1)

    if (userOtherTeams && userOtherTeams.length > 0) {
      res.status(409).json({ error: 'User is already a member of another team competing for this challenge.' })
      return
    }

    // 4. Insert new team member
    const memberId = crypto.randomUUID()
    const { data: newMember, error: insertErr } = await supabase
      .from('team_members')
      .insert({
        id: memberId,
        team_id: team_id,
        user_id: user_id,
        role: role.toUpperCase(),
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[API Team Join Insert Error]:', insertErr)
      res.status(500).json({ error: insertErr.message })
      return
    }

    res.status(200).json({
      success: true,
      membership: {
        id: newMember.id,
        team_id: newMember.team_id,
        user_id: newMember.user_id,
        role: newMember.role,
        created_at: newMember.created_at,
      },
    })
  } catch (err) {
    console.error('[API Team Join Exception]:', err)
    res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
}
