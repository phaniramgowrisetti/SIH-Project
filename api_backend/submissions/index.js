import crypto from 'crypto'
import { createServiceClient, createUserClient } from '../lib/supabase.js'
import { understandCivicIssue, generateEmbedding } from '../lib/ai/index.js'

export default async function handler(req, res) {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // --- GET: List Submissions ---
  if (req.method === 'GET') {
    try {
      const supabase = createServiceClient()
      const { district, status, id, ref_id, limit = 50 } = req.query || {}

      let query = supabase
        .from('problem_submissions')
        .select(`
          id,
          citizen_id,
          original_text,
          original_language,
          audio_url,
          submission_channel,
          status,
          created_at,
          districts (id, name, state),
          problem_ai_analysis (
            domain,
            subdomain,
            severity_score,
            severity_explanation,
            confidence,
            ai_model_version
          ),
          problem_embeddings (
            model_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit, 10))

      if (id) {
        const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
        if (isFullUuid) {
          query = query.eq('id', id.trim())
        }
      }
      if (status) query = query.eq('status', status)

      let { data, error } = await query

      if (error) {
        console.error('[API Submissions GET Error]:', error)
        res.status(500).json({ error: error.message })
        return
      }

      // If short Ref ID is provided, filter safely in-memory
      const targetShortId = (ref_id || (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim()) ? id : ''))
        .trim()
        .replace(/^ss-/i, '')
        .toLowerCase()

      if (targetShortId && data) {
        data = data.filter((row) => row.id.toLowerCase().startsWith(targetShortId))
      }

      // Map relational rows to clean presentation shape
      const formatted = (data || []).map((sub) => {
        const ai = Array.isArray(sub.problem_ai_analysis)
          ? sub.problem_ai_analysis[0]
          : sub.problem_ai_analysis
        const districtObj = sub.districts

        return {
          id: sub.id,
          ref_id: `SS-${sub.id.slice(0, 8).toUpperCase()}`,
          raw_text: sub.original_text,
          language: sub.original_language,
          audio_url: sub.audio_url,
          submission_channel: sub.submission_channel,
          status: sub.status,
          created_at: sub.created_at,
          district: districtObj?.name || 'Gumla',
          state: districtObj?.state || 'Jharkhand',
          primary_domain: ai?.domain || 'OTHER',
          severity_score: ai?.severity_score || 5.0,
          ai_summary: ai?.severity_explanation || sub.original_text,
          ai_model: ai?.ai_model_version || 'unknown',
          has_embedding: (sub.problem_embeddings?.length || 0) > 0,
        }
      })

      res.status(200).json({ submissions: formatted })
      return
    } catch (err) {
      console.error('[API Submissions GET Exception]:', err)
      res.status(500).json({ error: err.message || 'Internal Server Error' })
      return
    }
  }

  // --- POST: Create Citizen Submission ---
  if (req.method === 'POST') {
    try {
      const {
        method = 'text',
        raw_text,
        transcription,
        voice_audio_url,
        location_label,
        district = 'Gumla',
        state = 'Jharkhand',
        latitude,
        longitude,
        accuracy,
        captured_at,
        timestamp,
        is_mock_location = true,
        language = 'hi',
        evidence = [],
      } = req.body || {}

      if (!raw_text || raw_text.trim().length < 3) {
        res.status(400).json({ error: 'Complaint description is required (minimum 3 characters).' })
        return
      }

      const supabase = createServiceClient()

      // 1. Resolve or create district_id from lookup table
      let districtId = null
      if (district) {
        const { data: dData } = await supabase
          .from('districts')
          .select('id')
          .ilike('name', district.trim())
          .limit(1)

        if (dData && dData.length > 0) {
          districtId = dData[0].id
        } else {
          // Insert missing district record (e.g. NTR District, Andhra Pradesh)
          const newDistId = crypto.randomUUID()
          const { data: createdDist } = await supabase
            .from('districts')
            .insert({ id: newDistId, name: district.trim(), state: state || 'Andhra Pradesh' })
            .select('id')
            .single()

          if (createdDist) {
            districtId = createdDist.id
          }
        }
      }

      // Check for user ID from auth token
      let userId = null
      const authHeader = req.headers?.authorization
      if (authHeader) {
        try {
          const userClient = createUserClient(authHeader)
          const { data: { user } } = await userClient.auth.getUser()
          if (user) userId = user.id
        } catch (e) {
          console.warn('[API Submissions] JWT verification fallback:', e.message)
        }
      }

      // 2. Insert into problem_submissions
      const channel = (method || '').toLowerCase() === 'voice' ? 'VOICE_CALL' : 'WEB'
      const submissionId = crypto.randomUUID()

      const insertPayload = {
        id: submissionId,
        citizen_id: userId || null,
        original_text: raw_text.trim(),
        original_language: language || 'hi',
        translated_text: raw_text.trim(),
        audio_url: voice_audio_url || null,
        district_id: districtId,
        submission_channel: channel,
        status: 'SUBMITTED',
      }

      if (latitude && longitude) {
        insertPayload.location_geom = `POINT(${longitude} ${latitude})`
      }

      const { data: submission, error: subError } = await supabase
        .from('problem_submissions')
        .insert(insertPayload)
        .select()
        .single()

      if (subError) {
        console.error('[API Submissions Insert Error]:', subError)
        res.status(500).json({ error: subError.message })
        return
      }

      // 3. Run AI Understanding Pipeline
      const textToAnalyze = transcription || raw_text
      const effectiveLoc = location_label || `${district} District, ${state}`
      let aiResult = {
        primaryDomain: 'Water Quality & Sanitation',
        relatedDomains: [],
        issueSummary: raw_text.slice(0, 120),
        affectedGroups: ['Local Community'],
        possibleImpacts: ['Community concern requiring review'],
        severity: 'medium',
        entities: {},
        ai_provider: 'rule-fallback',
        ai_model: 'heuristic-v1',
      }

      try {
        aiResult = await understandCivicIssue(textToAnalyze, effectiveLoc)
      } catch (aiErr) {
        console.warn('[API Submissions AI Extraction Warning]:', aiErr.message)
      }

      // 4. Map severity string to numeric score (1-10)
      const severityScoreMap = { low: 3.0, medium: 6.0, high: 8.0, critical: 9.5 }
      const severityScore = severityScoreMap[aiResult.severity] || 6.0

      // 5. Insert structured AI analysis into problem_ai_analysis
      const { error: aiInsertError } = await supabase
        .from('problem_ai_analysis')
        .insert({
          id: crypto.randomUUID(),
          submission_id: submission.id,
          domain: (aiResult.primaryDomain || 'OTHER').toUpperCase(),
          subdomain: aiResult.relatedDomains?.[0] || null,
          severity_score: severityScore,
          severity_explanation: `${aiResult.issueSummary} | Possible Impacts: ${(aiResult.possibleImpacts || []).join('; ')}`,
          confidence: 0.95,
          ai_model_version: `${aiResult.ai_provider}:${aiResult.ai_model}`,
          detected_language: language || 'hi',
          transcribed_text: transcription || null,
        })

      if (aiInsertError) {
        console.warn('[API problem_ai_analysis Insert Warning]:', aiInsertError.message)
      }

      // 6. Generate 768-dimensional dense vector embedding
      let embeddingVector = null
      try {
        const textToEmbed = `${aiResult.primaryDomain}: ${aiResult.issueSummary}`
        embeddingVector = await generateEmbedding(textToEmbed)
      } catch (embErr) {
        console.warn('[API Submissions Embedding Warning]:', embErr.message)
      }

      // 7. Persist 768-dim semantic embedding in problem_embeddings
      if (embeddingVector && Array.isArray(embeddingVector)) {
        const { error: embInsertError } = await supabase
          .from('problem_embeddings')
          .insert({
            id: crypto.randomUUID(),
            submission_id: submission.id,
            embedding: JSON.stringify(embeddingVector),
            model_name: 'gemini-embedding-001',
          })

        if (embInsertError) {
          console.warn('[API problem_embeddings Insert Warning]:', embInsertError.message)
        }
      }

      // 7b. Auto-cluster new submission into problem_clusters & problem_cluster_members
      let targetClusterId = '00000000-0000-0000-0002-000000000001'
      try {
        const targetDomain = (aiResult.primaryDomain || 'WATER QUALITY & SANITATION').toUpperCase()
        const { data: existingClusters } = await supabase
          .from('problem_clusters')
          .select('id, problem_count')
          .ilike('primary_domain', targetDomain)
          .limit(1)

        if (existingClusters && existingClusters.length > 0) {
          targetClusterId = existingClusters[0].id
          await supabase
            .from('problem_clusters')
            .update({
              problem_count: (existingClusters[0].problem_count || 1) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetClusterId)
        } else {
          targetClusterId = crypto.randomUUID()
          await supabase
            .from('problem_clusters')
            .insert({
              id: targetClusterId,
              name: `${aiResult.primaryDomain || 'Civic Issue'} in ${district || 'Gumla'}`,
              description: raw_text.trim(),
              primary_domain: targetDomain,
              problem_count: 1,
              avg_severity: severityScore,
            })
        }

        await supabase
          .from('problem_cluster_members')
          .insert({
            id: crypto.randomUUID(),
            cluster_id: targetClusterId,
            submission_id: submission.id,
            similarity_score: 0.95,
          })

        await supabase
          .from('problem_submissions')
          .update({ status: 'CLUSTERED' })
          .eq('id', submission.id)
      } catch (clusterErr) {
        console.warn('[API Auto-Clustering Warning]:', clusterErr.message)
      }

      globalThis.__samadhan_active_problem_id = submission.id
      globalThis.__samadhan_latest_dispatched_problem_id = submission.id

      // 8. Return response formatted for frontend consumption
      const refId = `SS-${submission.id.slice(0, 8).toUpperCase()}`

      res.status(201).json({
        success: true,
        submission: {
          id: submission.id,
          ref_id: refId,
          raw_text: submission.original_text,
          transcription: transcription || null,
          voice_audio_url: voice_audio_url || null,
          language: submission.original_language,
          primary_domain: aiResult.primaryDomain,
          related_domains: aiResult.relatedDomains,
          ai_summary: aiResult.issueSummary,
          affected_groups: aiResult.affectedGroups,
          possible_impacts: aiResult.possibleImpacts,
          severity: aiResult.severity,
          entities: aiResult.entities,
          ai_provider: aiResult.ai_provider,
          ai_model: aiResult.ai_model,
          location_label: effectiveLoc,
          district: district,
          state: state,
          latitude: latitude ? parseFloat(latitude) : (submission.location_geom?.coordinates?.[1] || null),
          longitude: longitude ? parseFloat(longitude) : (submission.location_geom?.coordinates?.[0] || null),
          accuracy: accuracy ? parseFloat(accuracy) : null,
          captured_at: req.body?.captured_at || req.body?.timestamp || submission.created_at,
          is_mock_location: is_mock_location !== false,
          embedding: embeddingVector,
          status: 'understood',
          created_at: submission.created_at,
        },
      })
      return
    } catch (err) {
      console.error('[API Submissions POST Exception]:', err)
      res.status(500).json({ error: err.message || 'Internal Server Error' })
      return
    }
  }

  res.status(405).json({ error: `Method ${req.method} not allowed` })
}
