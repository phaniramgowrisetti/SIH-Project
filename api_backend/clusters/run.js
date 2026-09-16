import crypto from 'crypto'
import { createServiceClient } from '../lib/supabase.js'
import { clusterSubmissions } from '../lib/clustering/engine.js'

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

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: `Method ${req.method} not allowed` })
    return
  }

  try {
    const supabase = createServiceClient()

    // 1. Fetch all active submissions with embeddings and AI analysis
    const { data: submissions, error: fetchErr } = await supabase
      .from('problem_submissions')
      .select(`
        id,
        status,
        original_text,
        created_at,
        district_id,
        block_id,
        districts (id, name, state),
        blocks (id, name),
        problem_ai_analysis (
          domain,
          subdomain,
          severity_score,
          severity_explanation,
          confidence
        ),
        problem_embeddings (
          embedding,
          model_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (fetchErr) {
      console.error('[API Clusters Run Fetch Error]:', fetchErr)
      res.status(500).json({ error: fetchErr.message })
      return
    }

    if (!submissions || submissions.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No submissions found to cluster.',
        clusters: [],
        candidate_pairs: [],
        isolated: [],
        stats: { totalSubmissions: 0, clustersFormed: 0 },
      })
      return
    }

    // 2. Run deterministic clustering engine
    const clusteringResult = clusterSubmissions(submissions)
    const { clusters, candidatePairs, isolated, stats } = clusteringResult

    const persistedClusters = []

    // 3. Persist clusters to problem_clusters and problem_cluster_members
    for (const cluster of clusters) {
      const clusterId = crypto.randomUUID()

      const { data: clusterRow, error: clusterErr } = await supabase
        .from('problem_clusters')
        .insert({
          id: clusterId,
          name: cluster.name,
          description: cluster.description,
          primary_domain: cluster.primary_domain,
          avg_severity: cluster.avg_severity,
          problem_count: cluster.problem_count,
        })
        .select()
        .single()

      if (clusterErr) {
        console.error('[API Clusters Insert Error]:', clusterErr)
        continue
      }

      // Link member submissions in problem_cluster_members
      const memberInserts = cluster.members.map((m) => ({
        id: crypto.randomUUID(),
        cluster_id: clusterId,
        submission_id: m.id,
        similarity_score: m.similarity_score || 0.85,
      }))

      if (memberInserts.length > 0) {
        const { error: memberErr } = await supabase
          .from('problem_cluster_members')
          .insert(memberInserts)

        if (memberErr) {
          console.error('[API Cluster Members Insert Error]:', memberErr)
        }
      }

      // Update member problem_submissions status to 'CLUSTERED'
      const memberIds = cluster.members.map((m) => m.id)
      await supabase
        .from('problem_submissions')
        .update({
          status: 'CLUSTERED',
          updated_at: new Date().toISOString(),
        })
        .in('id', memberIds)

      persistedClusters.push({
        ...clusterRow,
        emergence_score: cluster.emergence_score,
        members_count: cluster.members.length,
        locations: cluster.locations,
      })
    }

    res.status(200).json({
      success: true,
      clusters: persistedClusters,
      candidate_pairs: candidatePairs.map((cp) => ({
        domain: cp.primary_domain,
        member_count: cp.members.length,
        similarity: cp.similarity,
        sample_ids: cp.members.map((m) => m.id),
      })),
      isolated_count: isolated.length,
      stats,
    })
  } catch (err) {
    console.error('[API Clusters Run Exception]:', err)
    res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
}
