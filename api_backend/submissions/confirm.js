import { createServiceClient } from '../lib/supabase.js'
import { generateEmbedding } from '../lib/ai/embedder.js'

export default async function handler(req, res) {
  // CORS headers
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
      submission_id,
      confirmed_domain,
      confirmed_impacts = [],
      confirmed_groups = [],
      confirmed_location,
      has_corrections = false,
    } = req.body || {}

    if (!submission_id) {
      res.status(400).json({ error: 'submission_id is required for confirmation' })
      return
    }

    const supabase = createServiceClient()

    // 1. Locate submission by full UUID or Ref ID prefix
    let submission = null
    const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submission_id.trim())

    if (isFullUuid) {
      const { data, error: fetchErr } = await supabase
        .from('problem_submissions')
        .select('*')
        .eq('id', submission_id.trim())
        .limit(1)

      if (fetchErr) {
        res.status(500).json({ error: fetchErr.message })
        return
      }
      if (data && data.length > 0) submission = data[0]
    } else {
      const shortId = submission_id.trim().replace(/^ss-/i, '').toLowerCase()
      const { data, error: fetchErr } = await supabase
        .from('problem_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchErr) {
        res.status(500).json({ error: fetchErr.message })
        return
      }
      submission = (data || []).find((row) => row.id.toLowerCase().startsWith(shortId))
    }

    if (!submission) {
      res.status(404).json({ error: `Submission not found: ${submission_id}` })
      return
    }

    // 2. Update problem_submissions status to VERIFIED
    const { error: subUpdateErr } = await supabase
      .from('problem_submissions')
      .update({
        status: 'VERIFIED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission.id)

    if (subUpdateErr) {
      console.error('[API Confirm Submissions Error]:', subUpdateErr)
      res.status(500).json({ error: subUpdateErr.message })
      return
    }

    // 3. Update or Insert problem_ai_analysis
    const upperDomain = (confirmed_domain || 'OTHER').toUpperCase()
    const impactsText = Array.isArray(confirmed_impacts)
      ? confirmed_impacts.join('; ')
      : confirmed_impacts || ''
    const explanation = `Confirmed by Citizen. Category: ${confirmed_domain}. Possible Impacts: ${impactsText}`

    const { data: existingAi } = await supabase
      .from('problem_ai_analysis')
      .select('id')
      .eq('submission_id', submission.id)
      .limit(1)

    if (existingAi && existingAi.length > 0) {
      await supabase
        .from('problem_ai_analysis')
        .update({
          domain: upperDomain,
          severity_explanation: explanation,
          updated_at: new Date().toISOString(),
        })
        .eq('submission_id', submission.id)
    }

    // 4. Re-generate 768-dim semantic embedding if domain or impacts were corrected
    let newEmbeddingVector = null
    if (has_corrections && confirmed_domain) {
      try {
        const textToEmbed = `${confirmed_domain}: ${submission.original_text} | ${impactsText}`
        newEmbeddingVector = await generateEmbedding(textToEmbed)

        if (newEmbeddingVector && Array.isArray(newEmbeddingVector)) {
          const { data: existingEmb } = await supabase
            .from('problem_embeddings')
            .select('id')
            .eq('submission_id', submission.id)
            .limit(1)

          if (existingEmb && existingEmb.length > 0) {
            await supabase
              .from('problem_embeddings')
              .update({
                embedding: JSON.stringify(newEmbeddingVector),
                model_name: 'gemini-embedding-001',
                updated_at: new Date().toISOString(),
              })
              .eq('submission_id', submission.id)
          }
        }
      } catch (embErr) {
        console.warn('[API Confirm Embedding Warning]:', embErr.message)
      }
    }

    const refId = `SS-${submission.id.slice(0, 8).toUpperCase()}`

    res.status(200).json({
      success: true,
      submission: {
        id: submission.id,
        ref_id: refId,
        status: 'VERIFIED',
        confirmed_by_citizen: true,
        primary_domain: confirmed_domain || upperDomain,
        affected_groups: confirmed_groups,
        possible_impacts: confirmed_impacts,
        location_label: confirmed_location,
        has_new_embedding: !!newEmbeddingVector,
        updated_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[API Submissions Confirm Exception]:', err)
    res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
}
