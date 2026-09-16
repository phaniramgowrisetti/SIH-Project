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
    // 0. Clean any existing seed data first to ensure strict idempotency
    const cleanupTables = [
      'milestones',
      'trl_gates',
      'projects',
      'team_members',
      'teams',
      'challenges',
      'problem_specifications',
      'problem_cluster_members',
      'problem_clusters',
      'problem_embeddings',
      'problem_ai_analysis',
      'problem_submissions',
    ]

    for (const tbl of cleanupTables) {
      await supabase.from(tbl).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    }

    // Ensure demo users exist
    const studentUserId = '11111111-1111-1111-1111-111111111111'
    const facultyUserId = '2b79fc24-8235-48a1-989f-2eee0a4bffc2'
    await supabase.from('users').upsert([
      {
        id: studentUserId,
        email: 'student@demo.ac.in',
        role: 'UNIVERSITY_RESEARCHER',
        status: 'ACTIVE',
      },
      {
        id: facultyUserId,
        email: 'faculty@demo.ac.in',
        role: 'FACULTY',
        status: 'ACTIVE',
      },
    ])


    // Known Districts
    const gumlaDistrictId = '45f4cdc5-52ba-438b-8119-6fb551dab556'
    const ranchiDistrictId = '1905f32f-9475-4e16-bfa3-b047a6f387aa'

    await supabase.from('districts').upsert([
      { id: gumlaDistrictId, name: 'Gumla', state: 'Jharkhand' },
      { id: ranchiDistrictId, name: 'Ranchi', state: 'Jharkhand' },
    ])

    // 1. Upload playable demo citizen audio note to Supabase Storage
    const audioPath = 'voice/demo_citizen_voice_note.webm'
    const mockAudioHeader = Buffer.from('RIFF$---WAVEfmt 10001000data----', 'utf-8')
    await supabase.storage.from('evidence-media').upload(audioPath, mockAudioHeader, {
      contentType: 'audio/webm',
      upsert: true,
    })
    const { data: { publicUrl: audioPublicUrl } } = supabase.storage
      .from('evidence-media')
      .getPublicUrl(audioPath)

    // 2. Deterministic IDs
    const subWater1Id = '00000000-0000-0000-0001-000000000001'
    const subWater2Id = '00000000-0000-0000-0001-000000000002'
    const subWater3Id = '00000000-0000-0000-0001-000000000003'
    const subAgri1Id = '00000000-0000-0000-0001-000000000004'
    const subAgri2Id = '00000000-0000-0000-0001-000000000005'

    const clusterWaterId = '00000000-0000-0000-0002-000000000001'
    const challengeOpenId = '00000000-0000-0000-0003-000000000001'
    const challengeActiveId = '00000000-0000-0000-0003-000000000002'
    const challengeCompletedId = '00000000-0000-0000-0003-000000000003'

    const teamActiveId = '00000000-0000-0000-0004-000000000001'
    const teamCompletedId = '00000000-0000-0000-0004-000000000002'

    const projectActiveId = '00000000-0000-0000-0005-000000000001'
    const projectCompletedId = '00000000-0000-0000-0005-000000000002'

    // 3. Insert Citizen Submissions
    const submissions = [
      {
        id: subWater1Id,
        original_text: 'Borewell water in Gumla has yellow tint and foul smell. Children are falling sick after drinking it.',
        translated_text: 'Borewell water in Gumla has yellow tint and foul smell. Children are falling sick after drinking it.',
        original_language: 'en',
        submission_channel: 'WEB',
        district_id: gumlaDistrictId,
        status: 'CLUSTERED',
      },
      {
        id: subWater2Id,
        original_text: 'हमारे गांव के नल से पानी बहुत खारा और मटमैला आ रहा है। फिल्टर की सख्त जरूरत है।',
        translated_text: 'The water from the tap in our village is very salty and muddy. A filter is urgently needed.',
        original_language: 'hi',
        submission_channel: 'WEB',
        district_id: gumlaDistrictId,
        status: 'CLUSTERED',
      },
      {
        id: subWater3Id,
        original_text: 'हाथ के चापाकल का पानी पीने से पेट दर्द और दांतों में पीलापन हो रहा है। फ्लोराइड की समस्या है।',
        translated_text: 'Drinking water from hand pump causes stomach pain and yellowing of teeth. There is a fluoride issue.',
        original_language: 'hi',
        submission_channel: 'VOICE',
        audio_url: audioPublicUrl,
        district_id: gumlaDistrictId,
        status: 'CLUSTERED',
      },
      {
        id: subAgri1Id,
        original_text: 'Lack of timely canal water for potato fields in Kanke block. Soil moisture drying rapidly.',
        translated_text: 'Lack of timely canal water for potato fields in Kanke block. Soil moisture drying rapidly.',
        original_language: 'en',
        submission_channel: 'WEB',
        district_id: ranchiDistrictId,
        status: 'SUBMITTED',
      },
      {
        id: subAgri2Id,
        original_text: 'धान के खेतों में सिंचाई के लिए बिजली केवल रात में आती है, स्वचालित सोलर पंप चाहिए।',
        translated_text: 'Electricity for irrigation in paddy fields only comes at night, automatic solar pump needed.',
        original_language: 'hi',
        submission_channel: 'WEB',
        district_id: ranchiDistrictId,
        status: 'SUBMITTED',
      },
    ]
    const { error: subErr } = await supabase.from('problem_submissions').insert(submissions)
    if (subErr) throw new Error(`Submissions insert failed: ${subErr.message}`)

    // 4. Insert AI Analysis
    const aiAnalysis = [
      {
        submission_id: subWater1Id,
        domain: 'WATER QUALITY & SANITATION',
        severity_score: 8.5,
        detected_language: 'en',
        translated_text: 'Borewell water in Gumla has yellow tint and foul smell. Children are falling sick after drinking it.',
        severity_explanation: 'High turbidity and chemical discoloration impacting community drinking water safety.',
        confidence: 0.96,
        ai_model_version: 'gemini-1.5-flash',
      },
      {
        submission_id: subWater2Id,
        domain: 'WATER QUALITY & SANITATION',
        severity_score: 8.0,
        detected_language: 'hi',
        translated_text: 'The water from the tap in our village is very salty and muddy. A filter is urgently needed.',
        severity_explanation: 'High salinity and suspended solids in village tap water.',
        confidence: 0.94,
        ai_model_version: 'gemini-1.5-flash',
      },
      {
        submission_id: subWater3Id,
        domain: 'WATER QUALITY & SANITATION',
        severity_score: 9.0,
        detected_language: 'hi',
        transcribed_text: 'हाथ के चापाकल का पानी पीने से पेट दर्द और दांतों में पीलापन हो रहा है। फ्लोराइड की समस्या है।',
        translated_text: 'Drinking water from hand pump causes stomach pain and yellowing of teeth. There is a fluoride issue.',
        severity_explanation: 'Direct evidence of endemic fluorosis from deep aquifer handpumps.',
        confidence: 0.98,
        ai_model_version: 'gemini-1.5-flash',
      },
      {
        submission_id: subAgri1Id,
        domain: 'AGRICULTURE & RURAL LIVELIHOOD',
        severity_score: 6.5,
        detected_language: 'en',
        translated_text: 'Lack of timely canal water for potato fields in Kanke block. Soil moisture drying rapidly.',
        severity_explanation: 'Canal schedule delays causing acute moisture stress.',
        confidence: 0.92,
        ai_model_version: 'gemini-1.5-flash',
      },
      {
        submission_id: subAgri2Id,
        domain: 'AGRICULTURE & RURAL LIVELIHOOD',
        severity_score: 7.0,
        detected_language: 'hi',
        translated_text: 'Electricity for irrigation in paddy fields only comes at night, automatic solar pump needed.',
        severity_explanation: 'Night-only power schedule hampers farm safety.',
        confidence: 0.91,
        ai_model_version: 'gemini-1.5-flash',
      },
    ]
    const { error: aiErr } = await supabase.from('problem_ai_analysis').insert(aiAnalysis)
    if (aiErr) throw new Error(`AI Analysis insert failed: ${aiErr.message}`)

    // 5. Insert Serialized 768-dim Embeddings
    const dummyVector = Array.from({ length: 768 }, (_, i) => Math.sin(i / 10) * 0.05)
    const serializedVector = JSON.stringify(dummyVector)
    const embeddings = submissions.map((s) => ({
      submission_id: s.id,
      embedding: serializedVector,
      model_name: 'models/gemini-embedding-001',
    }))
    const { error: embErr } = await supabase.from('problem_embeddings').insert(embeddings)
    if (embErr) throw new Error(`Embeddings insert failed: ${embErr.message}`)

    // 6. Insert Emerging Problem Cluster
    const { error: clusErr } = await supabase.from('problem_clusters').insert({
      id: clusterWaterId,
      name: 'Unsafe Drinking Water in Gumla',
      description: 'Recurring reports of high fluoride contamination and water turbidity across Gumla borewells affecting community health.',
      primary_domain: 'WATER QUALITY & SANITATION',
      problem_count: 3,
      avg_severity: 8.5,
    })
    if (clusErr) throw new Error(`Cluster insert failed: ${clusErr.message}`)

    const { error: memErr0 } = await supabase.from('problem_cluster_members').insert([
      { id: '00000000-0000-0000-0002-000000000011', cluster_id: clusterWaterId, submission_id: subWater1Id, similarity_score: 0.94 },
      { id: '00000000-0000-0000-0002-000000000012', cluster_id: clusterWaterId, submission_id: subWater2Id, similarity_score: 0.91 },
      { id: '00000000-0000-0000-0002-000000000013', cluster_id: clusterWaterId, submission_id: subWater3Id, similarity_score: 0.96 },
    ])
    if (memErr0) throw new Error(`Cluster members insert failed: ${memErr0.message}`)

    // 7. Insert Validated Problem Specification
    await supabase.from('problem_specifications').insert({
      id: '00000000-0000-0000-0002-000000000021',
      cluster_id: clusterWaterId,
      root_cause: 'Geological fluoride leaching in deep pre-Cambrian granitic aquifers combined with high silt turbidity.',
      affected_population_estimate: 18000,
      verified_by: facultyUserId,
      status: 'VERIFIED',
    })

    // 8. Insert Innovation Challenges
    const challenges = [
      {
        id: challengeOpenId,
        title: 'Solar-Powered Fluoride Removal System for Gumla Borewells',
        description: 'Design and prototype a scalable, low-cost gravity-fed or solar-assisted filtration unit removing excess fluoride (<1.0 mg/L) from community borewells.',
        status: 'OPEN',
        trl_stage: 1,
      },
      {
        id: challengeActiveId,
        title: 'Smart Soil Moisture & Irrigation IoT for Ranchi Smallholders',
        description: 'Develop an affordable solar-powered IoT soil telemetry unit that automates drip valves during daylight hours.',
        status: 'MATCHING',
        trl_stage: 2,
      },
      {
        id: challengeCompletedId,
        title: 'Gravity Bio-Sand & Activated Alumina Filter for Simdega',
        description: 'Engineered dual-stage gravity adsorption filter for village school water tanks.',
        status: 'CLOSED',
        trl_stage: 4,
      },
    ]
    const { error: chalErr } = await supabase.from('challenges').insert(challenges)
    if (chalErr) throw new Error(`Challenges insert failed: ${chalErr.message}`)

    // 9. Insert Teams & Members
    const { error: teamErr } = await supabase.from('teams').insert([
      {
        id: teamActiveId,
        name: 'KisanTech Innovators',
        challenge_id: challengeActiveId,
        lead_user_id: studentUserId,
      },
      {
        id: teamCompletedId,
        name: 'AquaInnovate Tech Team',
        challenge_id: challengeCompletedId,
        lead_user_id: studentUserId,
      },
    ])
    if (teamErr) throw new Error(`Teams insert failed: ${teamErr.message}`)

    const { error: memErr } = await supabase.from('team_members').insert([
      { id: '00000000-0000-0000-0004-000000000011', team_id: teamActiveId, user_id: studentUserId, role: 'Lead IoT Architect' },
      { id: '00000000-0000-0000-0004-000000000012', team_id: teamCompletedId, user_id: studentUserId, role: 'Filtration Lead' },
    ])
    if (memErr) throw new Error(`Team members insert failed: ${memErr.message}`)

    // 10. Insert Projects (1 ACTIVE, 1 COMPLETED)
    const { error: projErr } = await supabase.from('projects').insert([
      {
        id: projectActiveId,
        challenge_id: challengeActiveId,
        team_id: teamActiveId,
        mentor_id: facultyUserId,
        status: 'ACTIVE',
        trl_stage: 2,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: projectCompletedId,
        challenge_id: challengeCompletedId,
        team_id: teamCompletedId,
        mentor_id: facultyUserId,
        status: 'COMPLETED',
        trl_stage: 4,
        start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ])
    if (projErr) throw new Error(`Projects insert failed: ${projErr.message}`)

    // 11. Insert TRL Gates with Scored 50-Point Rubrics
    const { error: gateErr } = await supabase.from('trl_gates').insert([
      {
        id: '00000000-0000-0000-0005-000000000011',
        project_id: projectActiveId,
        from_stage: 1,
        to_stage: 2,
        status: 'PASSED',
        decision: 'APPROVED',
        decision_reason: 'Strong sensor architecture. Ranchi University Dept of Agriculture allocated greenhouse testing beds.',
        criteria: {
          solution_title: 'Smart Soil Moisture & Irrigation IoT',
          technical_approach: 'ESP32 LoRa nodes + capacitive soil sensors with automated solenoid valves.',
          expected_impact: '35% water savings across 80 vegetable farming households.',
          rubric: {
            score_feasibility: 14,
            score_impact: 15,
            score_innovation: 9,
            score_team: 9,
            total_score: 47,
            max_score: 50,
          },
        },
        reviewer_id: facultyUserId,
        decided_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '00000000-0000-0000-0005-000000000012',
        project_id: projectCompletedId,
        from_stage: 1,
        to_stage: 4,
        status: 'PASSED',
        decision: 'APPROVED',
        decision_reason: 'Complete field validation successful. Certified by Simdega District Administration.',
        criteria: {
          solution_title: 'Gravity Bio-Sand & Activated Alumina Filter',
          technical_approach: 'Dual-column gravity filter with locally regenerated alumina media.',
          expected_impact: 'Purifies 1,500 L/day providing safe fluoride-free water to 3 schools.',
          rubric: {
            score_feasibility: 15,
            score_impact: 15,
            score_innovation: 10,
            score_team: 9,
            total_score: 49,
            max_score: 50,
          },
        },
        reviewer_id: facultyUserId,
        decided_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ])
    if (gateErr) throw new Error(`TRL Gates insert failed: ${gateErr.message}`)

    // 12. Insert Milestones
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    // Milestones for Active Project (1 Completed, 1 In Progress, 2 Pending = 25% Progress)
    const activeMilestones = [
      {
        id: '00000000-0000-0000-0006-000000000001',
        project_id: projectActiveId,
        title: 'Phase 1: Field Research & Problem Specification',
        description: 'Survey 25 vegetable plots in Kanke block to map soil moisture profiles and irrigation timing.',
        status: 'COMPLETED',
        due_date: new Date(now - 10 * day).toISOString(),
        reviewed_at: new Date(now - 12 * day).toISOString(),
        reviewed_by: facultyUserId,
      },
      {
        id: '00000000-0000-0000-0006-000000000002',
        project_id: projectActiveId,
        title: 'Phase 2: MVP Prototype Design & Lab Assembly',
        description: 'Assemble ESP32 capacitive probe circuit with LoRa telemetry transmission.',
        status: 'IN_PROGRESS',
        due_date: new Date(now + 15 * day).toISOString(),
      },
      {
        id: '00000000-0000-0000-0006-000000000003',
        project_id: projectActiveId,
        title: 'Phase 3: Field Pilot Testing in Rural Community',
        description: 'Install 5 pilot sensor nodes on potato cultivation plots.',
        status: 'PENDING',
        due_date: new Date(now + 35 * day).toISOString(),
      },
      {
        id: '00000000-0000-0000-0006-000000000004',
        project_id: projectActiveId,
        title: 'Phase 4: Community Deployment & Handover',
        description: 'Handover farmer telemetry app to Kanke Krishi Vigyan Kendra.',
        status: 'PENDING',
        due_date: new Date(now + 60 * day).toISOString(),
      },
    ]

    // Milestones for Completed Project (All 4 Completed = 100% Progress)
    const completedMilestones = [
      {
        id: '00000000-0000-0000-0006-000000000011',
        project_id: projectCompletedId,
        title: 'Phase 1: Field Research & Problem Specification',
        description: 'Gumla fluoride aquifer testing and mineral baseline mapping.',
        status: 'COMPLETED',
        due_date: new Date(now - 75 * day).toISOString(),
        reviewed_at: new Date(now - 70 * day).toISOString(),
        reviewed_by: facultyUserId,
      },
      {
        id: '00000000-0000-0000-0006-000000000012',
        project_id: projectCompletedId,
        title: 'Phase 2: MVP Prototype Design & Lab Assembly',
        description: 'Dual-stage filtration column assembly and flow-rate testing.',
        status: 'COMPLETED',
        due_date: new Date(now - 50 * day).toISOString(),
        reviewed_at: new Date(now - 45 * day).toISOString(),
        reviewed_by: facultyUserId,
        evidence_url: 'https://github.com/lucky/samadhan-alumina-cad',
      },
      {
        id: '00000000-0000-0000-0006-000000000013',
        project_id: projectCompletedId,
        title: 'Phase 3: Field Pilot Testing in Rural Community',
        description: '45-day continuous testing on primary school borewell in Simdega.',
        status: 'COMPLETED',
        due_date: new Date(now - 25 * day).toISOString(),
        reviewed_at: new Date(now - 20 * day).toISOString(),
        reviewed_by: facultyUserId,
        evidence_url: 'https://storage.samadhansetu.gov.in/simdega_lab_test_pass.pdf',
      },
      {
        id: '00000000-0000-0000-0006-000000000014',
        project_id: projectCompletedId,
        title: 'Phase 4: Community Deployment & Handover',
        description: 'Handover to village panchayat with maintenance manual.',
        status: 'COMPLETED',
        due_date: new Date(now - 5 * day).toISOString(),
        reviewed_at: new Date(now - 2 * day).toISOString(),
        reviewed_by: facultyUserId,
        evidence_url: 'https://storage.samadhansetu.gov.in/panchayat_handover_signed.pdf',
      },
    ]

    const { error: mileErr } = await supabase.from('milestones').insert([...activeMilestones, ...completedMilestones])
    if (mileErr) throw new Error(`Milestones insert failed: ${mileErr.message}`)

    res.status(200).json({
      success: true,
      message: 'Baseline SIH demonstration dataset successfully seeded!',
      seeded_counts: {
        submissions: submissions.length,
        clusters: 1,
        challenges: challenges.length,
        teams: 2,
        projects: 2,
        milestones: activeMilestones.length + completedMilestones.length,
      },
      audio_url: audioPublicUrl,
    })
  } catch (err) {
    console.error('[API Admin Seed Exception]:', err)
    res.status(500).json({ error: err.message || 'Failed to seed demo data' })
  }
}
