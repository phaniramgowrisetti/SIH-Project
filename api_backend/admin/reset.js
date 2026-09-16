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

  const supabase = createServiceClient()

  try {
    // 1. Delete transactional records in reverse foreign key order
    const cleanupOperations = [
      { table: 'milestones', desc: 'Project Milestones' },
      { table: 'trl_gates', desc: 'TRL Gates & Rubrics' },
      { table: 'projects', desc: 'Projects & Proposals' },
      { table: 'team_members', desc: 'Team Members' },
      { table: 'teams', desc: 'Innovation Teams' },
      { table: 'challenges', desc: 'Innovation Challenges' },
      { table: 'problem_specifications', desc: 'Problem Specifications' },
      { table: 'problem_cluster_members', desc: 'Cluster Members' },
      { table: 'problem_clusters', desc: 'Problem Clusters' },
      { table: 'problem_embeddings', desc: 'Problem Embeddings' },
      { table: 'problem_ai_analysis', desc: 'Problem AI Analysis' },
      { table: 'problem_submissions', desc: 'Citizen Submissions' },
    ]

    const deletedCounts = {}

    for (const op of cleanupOperations) {
      // Delete all records where id is not null
      const { error } = await supabase
        .from(op.table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        console.warn(`[Reset Warning] Error cleaning ${op.table}:`, error.message)
      }
    }

    // 2. Verify all transactional tables are 0
    const verification = {}
    let allClean = true

    for (const op of cleanupOperations) {
      const { count } = await supabase
        .from(op.table)
        .select('*', { count: 'exact', head: true })

      verification[op.table] = count ?? 0
      if (count !== 0) {
        allClean = false
      }
    }

    res.status(200).json({
      success: true,
      message: 'Transactional demonstration and test data cleanly reset.',
      all_clean: allClean,
      verification,
    })
  } catch (err) {
    console.error('[API Admin Reset Exception]:', err)
    res.status(500).json({ error: err.message || 'Failed to reset test data' })
  }
}
