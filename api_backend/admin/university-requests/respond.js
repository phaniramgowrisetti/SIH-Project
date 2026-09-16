import { createServiceClient } from '../../lib/supabase.js'

export default async function handler(req, res) {
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

  const supabase = createServiceClient()
  const globalStore = globalThis.__samadhan_university_requests || new Map()

  try {
    const {
      problemId = '00000000-0000-0000-0002-000000000001',
      universityId = '2b79fc24-8235-48a1-989f-2eee0a4bffc2',
      status = 'ACCEPTED', // 'ACCEPTED' | 'DECLINED'
    } = req.body || {}

    let storedMap = globalStore.get(problemId)
    if (!storedMap) {
      storedMap = new Map()
      globalStore.set(problemId, storedMap)
    }

    let existingRecord = storedMap.get(universityId)
    if (!existingRecord) {
      existingRecord = {
        problemId,
        universityId,
        universityName: universityId === 'bit_mesra' ? 'BIT Mesra' : 'Ranchi University',
        status: status,
        updatedAt: new Date().toISOString(),
      }
    } else {
      existingRecord.status = status
      existingRecord.updatedAt = new Date().toISOString()
    }

    storedMap.set(universityId, existingRecord)

    // Sync status to Supabase problem_specifications and challenges
    try {
      if (status === 'ACCEPTED') {
        await supabase
          .from('problem_specifications')
          .update({
            status: 'ACCEPTED',
            human_verification_status: 'ACCEPTED',
            updated_at: new Date().toISOString(),
          })
          .eq('cluster_id', problemId)

        await supabase
          .from('challenges')
          .update({
            status: 'ADOPTED',
            adopted_by_faculty: universityId,
            updated_at: new Date().toISOString(),
          })
          .limit(1)
      } else if (status === 'DECLINED') {
        // If all requests declined, revert spec status
        const hasAccepted = Array.from(storedMap.values()).some((r) => r.status === 'ACCEPTED')
        if (!hasAccepted) {
          await supabase
            .from('problem_specifications')
            .update({
              status: 'VERIFIED',
              human_verification_status: 'VERIFIED',
            })
            .eq('cluster_id', problemId)
        }
      }
    } catch (dbErr) {
      console.warn('[Supabase Sync Warning in Respond]:', dbErr.message)
    }

    const allRecords = Array.from(storedMap.values())
    const summary = {
      total: allRecords.length,
      sent: allRecords.filter((r) => r.status === 'REQUEST_SENT').length,
      accepted: allRecords.filter((r) => r.status === 'ACCEPTED').length,
      pending: allRecords.filter((r) => r.status === 'PENDING' || r.status === 'REQUEST_SENT').length,
      declined: allRecords.filter((r) => r.status === 'DECLINED').length,
    }

    res.status(200).json({
      success: true,
      message: `Status updated to ${status} for university ${universityId}`,
      universityId,
      status,
      summary,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[API University Requests Respond Error]:', err)
    res.status(500).json({ error: err.message || 'Failed to update university response status' })
  }
}
