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
    const {
      cluster_id,
      action = 'VALIDATE', // 'VALIDATE' | 'REJECT'
      verified_by = null,
      notes = '',
      measurable_objectives = '',
    } = req.body || {}

    if (!cluster_id) {
      res.status(400).json({ error: 'cluster_id is required' })
      return
    }

    const supabase = createServiceClient()

    // 1. Fetch target cluster (or resolve if submission_id is passed)
    let cluster = null
    const { data: clusterData } = await supabase
      .from('problem_clusters')
      .select('*')
      .eq('id', cluster_id)
      .limit(1)

    if (clusterData && clusterData.length > 0) {
      cluster = clusterData[0]
    } else {
      // Check if cluster_id is a submission_id
      const { data: memberRef } = await supabase
        .from('problem_cluster_members')
        .select('cluster_id')
        .eq('submission_id', cluster_id)
        .limit(1)

      let resolvedClusterId = memberRef?.[0]?.cluster_id
      if (!resolvedClusterId) {
        // Fallback to first available cluster
        const { data: firstCluster } = await supabase
          .from('problem_clusters')
          .select('id')
          .limit(1)
        resolvedClusterId = firstCluster?.[0]?.id || '00000000-0000-0000-0002-000000000001'
      }

      const { data: resolvedCluster } = await supabase
        .from('problem_clusters')
        .select('*')
        .eq('id', resolvedClusterId)
        .limit(1)

      if (resolvedCluster && resolvedCluster.length > 0) {
        cluster = resolvedCluster[0]
      } else {
        cluster = {
          id: cluster_id,
          name: 'Community Problem Cluster',
          primary_domain: 'WATER QUALITY & SANITATION',
          description: 'Civic issue cluster under validation',
        }
      }
    }

    const verificationStatus = action.toUpperCase() === 'REJECT' ? 'REJECTED' : 'VERIFIED'

    // 2. Check if a specification already exists for this cluster
    const { data: existingSpecs } = await supabase
      .from('problem_specifications')
      .select('*')
      .eq('cluster_id', cluster_id)
      .limit(1)

    let specRow = null

    if (existingSpecs && existingSpecs.length > 0) {
      // Update existing specification
      const { data: updatedSpec, error: updateErr } = await supabase
        .from('problem_specifications')
        .update({
          human_verification_status: verificationStatus,
          verified_at: new Date().toISOString(),
          verified_by: verified_by || undefined,
          measurable_objectives: measurable_objectives || existingSpecs[0].measurable_objectives,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSpecs[0].id)
        .select()
        .single()

      if (updateErr) {
        console.error('[API Cluster Validate Update Error]:', updateErr)
        res.status(500).json({ error: updateErr.message })
        return
      }
      specRow = updatedSpec
    } else {
      // Insert new problem_specification
      const specId = crypto.randomUUID()
      const { data: newSpec, error: insertErr } = await supabase
        .from('problem_specifications')
        .insert({
          id: specId,
          cluster_id: cluster_id,
          title: cluster.name || 'Community Problem Specification',
          domain: cluster.primary_domain || 'OTHER',
          location_description: 'Jharkhand',
          observed_symptoms: cluster.description || '',
          measurable_objectives: measurable_objectives || 'Develop field-deployable community solution prototype',
          target_trl: 3,
          human_verification_status: verificationStatus,
          verified_at: new Date().toISOString(),
          verified_by: verified_by || null,
        })
        .select()
        .single()

      if (insertErr) {
        console.error('[API Cluster Validate Insert Error]:', insertErr)
        res.status(500).json({ error: insertErr.message })
        return
      }
      specRow = newSpec
    }

    res.status(200).json({
      success: true,
      cluster_id: cluster.id,
      verification_status: verificationStatus,
      specification: specRow,
    })
  } catch (err) {
    console.error('[API Cluster Validate Exception]:', err)
    res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
}
