import { createServiceClient } from '../lib/supabase.js'

export default async function handler(req, res) {
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

  // 1. GET /api/admin/assign - Get university assignment status
  if (req.method === 'GET') {
    try {
      const { cluster_id, specification_id } = req.query || {}

      let specQuery = supabase.from('problem_specifications').select('*')
      if (specification_id) specQuery = specQuery.eq('id', specification_id)
      else if (cluster_id) specQuery = specQuery.eq('cluster_id', cluster_id)

      const { data: specData } = await specQuery.limit(1)
      const spec = specData?.[0] || null

      const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .limit(1)

      const challenge = challenges?.[0] || null

      res.status(200).json({
        success: true,
        specification: spec,
        challenge,
        assignment_status: spec?.status || challenge?.status || 'VERIFIED',
      })
    } catch (err) {
      console.error('[API Assign GET Error]:', err)
      res.status(500).json({ error: err.message })
    }
    return
  }

  // 2. POST /api/admin/assign - Initiate assignment or process acceptance
  if (req.method === 'POST') {
    try {
      const {
        action = 'ASSIGN',
        cluster_id = '00000000-0000-0000-0002-000000000001',
        university_id = '2b79fc24-8235-48a1-989f-2eee0a4bffc2',
        faculty_email = 'faculty@demo.ac.in',
      } = req.body || {}

      if (action === 'ASSIGN') {
        // Update problem_specifications status to REQUEST_SENT
        await supabase
          .from('problem_specifications')
          .update({
            status: 'REQUEST_SENT',
            human_verification_status: 'REQUEST_SENT',
            updated_at: new Date().toISOString(),
          })
          .eq('cluster_id', cluster_id)

        // Update challenge status to MATCHING
        await supabase
          .from('challenges')
          .update({
            status: 'MATCHING',
            adopted_by_faculty: university_id,
            updated_at: new Date().toISOString(),
          })
          .limit(1)

        res.status(200).json({
          success: true,
          message: 'University request created. Opportunity is now available in University Portal.',
          status: 'REQUEST_SENT',
          university: 'Ranchi University Dept of Environmental Engineering',
          faculty_email,
          timestamp: new Date().toISOString(),
        })
        return
      }

      if (action === 'ACCEPT') {
        // Update problem_specifications status to ACCEPTED
        await supabase
          .from('problem_specifications')
          .update({
            status: 'ACCEPTED',
            human_verification_status: 'ACCEPTED',
            updated_at: new Date().toISOString(),
          })
          .eq('cluster_id', cluster_id)

        // Update challenge status to ADOPTED
        await supabase
          .from('challenges')
          .update({
            status: 'ADOPTED',
            adopted_by_faculty: university_id,
            updated_at: new Date().toISOString(),
          })
          .limit(1)

        res.status(200).json({
          success: true,
          message: 'University accepted challenge request.',
          status: 'ACCEPTED',
          university: 'Ranchi University Dept of Environmental Engineering',
          mentor: 'Dr. Anjali Kumar (Faculty Mentor)',
          timestamp: new Date().toISOString(),
        })
        return
      }

      if (action === 'DECLINE') {
        await supabase
          .from('problem_specifications')
          .update({
            status: 'VERIFIED',
            human_verification_status: 'VERIFIED',
          })
          .eq('cluster_id', cluster_id)

        res.status(200).json({
          success: true,
          message: 'Opportunity declined and returned to verification queue.',
          status: 'VERIFIED',
        })
        return
      }

      res.status(400).json({ error: `Unknown action: ${action}` })
    } catch (err) {
      console.error('[API Assign POST Error]:', err)
      res.status(500).json({ error: err.message || 'Failed to update assignment status' })
    }
    return
  }

  res.status(405).json({ error: `Method ${req.method} not allowed` })
}
