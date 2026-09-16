import { createServiceClient } from '../lib/supabase.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: `Method ${req.method} not allowed` })
    return
  }

  try {
    const supabase = createServiceClient()

    // Query exact current counts across all transactional tables
    const [
      { count: totalSubmissions },
      { count: newSubmissions },
      { count: totalClusters },
      { count: validatedClusters },
      { count: activeChallenges },
      { count: activeProjects },
      { count: completedProjects },
    ] = await Promise.all([
      supabase.from('problem_submissions').select('*', { count: 'exact', head: true }),
      supabase.from('problem_submissions').select('*', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
      supabase.from('problem_clusters').select('*', { count: 'exact', head: true }),
      supabase.from('problem_specifications').select('*', { count: 'exact', head: true }).eq('human_verification_status', 'VERIFIED'),
      supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).in('status', ['PLANNING', 'ACTIVE']),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
    ])

    // Query latest problem clusters for the incoming review list
    const { data: latestClusters } = await supabase
      .from('problem_clusters')
      .select('id, name, description, primary_domain, problem_count, avg_severity, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    const awaitingReview = Math.max(0, (totalClusters || 0) - (validatedClusters || 0))

    res.status(200).json({
      success: true,
      metrics: {
        newRequests: awaitingReview,
        pending: validatedClusters || 0,
        active: (activeChallenges || 0) + (activeProjects || 0),
        totalSubmissions: totalSubmissions || 0,
        awaitingReview: awaitingReview,
        underEvaluation: validatedClusters || 0,
        activeProjects: activeProjects || 0,
        deployed: completedProjects || 0,
      },
      recentClusters: (latestClusters || []).map(c => ({
        id: c.id,
        title: c.name,
        description: c.description,
        primary_domain: c.primary_domain,
        problem_count: c.problem_count,
        avg_severity: c.avg_severity,
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[API Admin Dashboard Error]:', err)
    res.status(500).json({ error: err.message || 'Failed to aggregate dashboard metrics' })
  }
}
