import { createServiceClient } from '../lib/supabase.js'

// Dynamic in-memory project store for local operation
const DYNAMIC_PROJECTS = []

// Standard baseline projects for local / offline operation mode
const DEFAULT_PROJECTS = [
  {
    id: 'proj-water-aquasense',
    challenge_id: 'ch-water-gumla',
    challenge_title: 'Drinking Water Quality & Heavy Metal Filtration',
    challenge_description: 'High levels of fluoride and heavy metals detected in village borewells affecting primary school drinking nodes across 3 blocks in Gumla district.',
    team_id: 'team-aquasense',
    team_name: 'Team AquaSense',
    lead_user_id: 'demo-user-student-003',
    members: [
      { user_id: 'demo-user-student-003', email: 'student@demo.ac.in', role: 'Team Lead / Environmental Eng' },
      { user_id: 'student-2', email: 'iot.lead@bitmesra.ac.in', role: 'IoT Sensor Specialist' },
      { user_id: 'student-3', email: 'chem.eng@bitmesra.ac.in', role: 'Chemical Filtration Specialist' }
    ],
    members_count: 3,
    mentor_id: 'demo-user-admin-002',
    mentor_name: 'Dr. Anjali Kumar (Faculty Mentor, Ranchi University)',
    partner_name: 'Jharkhand State Water Mission',
    status: 'ACTIVE',
    trl_stage: 4,
    stage_label: 'PROTOTYPE',
    start_date: '2026-08-01T00:00:00Z',
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    progress_percent: 50,
    milestones_count: 4,
    completed_milestones_count: 2,
    milestones: [
      {
        id: 'm-water-1',
        title: 'Phase 1: Water Sample Collection & Spectrometry Assay',
        description: 'Collect 15 water samples across 3 blocks in Gumla district and complete ICP-MS heavy metal spectrometry analysis.',
        status: 'COMPLETED',
        due_date: '2026-08-20',
        evidence_url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
        created_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'm-water-2',
        title: 'Phase 2: Multi-Stage Filtration Chamber & Sensor Node Fabrication',
        description: 'Fabricate 50L/hr activated zeolite filter vessel integrated with ESP32 fluoride & pH telemetry module.',
        status: 'COMPLETED',
        due_date: '2026-09-05',
        evidence_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
        created_at: '2026-08-15T00:00:00Z'
      },
      {
        id: 'm-water-3',
        title: 'Phase 3: Primary School Field Pilot & Live Telemetry Stream',
        description: 'Deploy filtration node at Gumla Primary School and record 7-day continuous water flow purity logs.',
        status: 'UNDER_REVIEW',
        due_date: '2026-09-25',
        evidence_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800',
        created_at: '2026-09-01T00:00:00Z'
      },
      {
        id: 'm-water-4',
        title: 'Phase 4: District Water Board Scaled Deployment & Verification',
        description: 'Commission 12 village filtration points with automated maintenance alert webhooks.',
        status: 'NOT_STARTED',
        due_date: '2026-10-15',
        evidence_url: null,
        created_at: '2026-09-05T00:00:00Z'
      }
    ],
    rubric: {
      technical_feasibility: 9.2,
      community_impact: 9.5,
      cost_efficiency: 8.8,
      scalability: 9.0
    },
    decision: 'APPROVED',
    evaluator_feedback: 'Outstanding multi-disciplinary design with high direct impact on rural school children.'
  },
  {
    id: 'proj-agri-shield',
    challenge_id: 'ch-agri-simdega',
    challenge_title: 'Crop Disease & Fungal Blight Early Detection System',
    challenge_description: 'Unidentified fungal blight reducing paddy yield across smallholder farms, affecting monsoon harvesting in Simdega district.',
    team_id: 'team-agri-shield',
    team_name: 'AgriShield AI',
    lead_user_id: 'demo-user-student-004',
    members: [
      { user_id: 'demo-user-student-004', email: 'agri.lead@ranchi.ac.in', role: 'Agronomy Research Lead' },
      { user_id: 'student-5', email: 'ai.dev@ranchi.ac.in', role: 'Computer Vision Engineer' }
    ],
    members_count: 2,
    mentor_id: 'demo-user-admin-002',
    mentor_name: 'Dr. Anjali Kumar (Faculty Mentor, Ranchi University)',
    partner_name: 'Jharkhand Agricultural Development Board',
    status: 'COMPLETED',
    trl_stage: 7,
    stage_label: 'DEPLOYED',
    start_date: '2026-05-10T00:00:00Z',
    created_at: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    updated_at: new Date().toISOString(),
    progress_percent: 100,
    milestones_count: 4,
    completed_milestones_count: 4,
    milestones: [
      {
        id: 'm-agri-1',
        title: 'Phase 1: Fungal Blight Image Dataset Collection',
        description: 'Annotate 2,500 paddy leaf images with plant pathology diagnostics.',
        status: 'COMPLETED',
        due_date: '2026-06-01',
        evidence_url: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=800',
        created_at: '2026-05-10T00:00:00Z'
      },
      {
        id: 'm-agri-2',
        title: 'Phase 2: Edge ML Model Training & Mobile App Integration',
        description: 'Deploy MobileNetV3 classifier achieving 94.2% accuracy offline on low-end smartphones.',
        status: 'COMPLETED',
        due_date: '2026-07-01',
        evidence_url: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800',
        created_at: '2026-06-05T00:00:00Z'
      },
      {
        id: 'm-agri-3',
        title: 'Phase 3: Simdega KVK Extension Field Validation',
        description: 'Conduct field trials across 8 Gram Panchayats with Krishi Vigyan Kendra officers.',
        status: 'COMPLETED',
        due_date: '2026-08-01',
        evidence_url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800',
        created_at: '2026-07-05T00:00:00Z'
      },
      {
        id: 'm-agri-4',
        title: 'Phase 4: District Adoption & Farmer Advisory Rollout',
        description: 'Train 450 smallholder farmers and launch real-time SMS treatment alert system.',
        status: 'COMPLETED',
        due_date: '2026-08-25',
        evidence_url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800',
        created_at: '2026-08-01T00:00:00Z'
      }
    ],
    rubric: {
      technical_feasibility: 9.5,
      community_impact: 9.6,
      cost_efficiency: 9.4,
      scalability: 9.5
    },
    decision: 'APPROVED',
    evaluator_feedback: 'Successfully commercialized and deployed to Simdega agriculture office.'
  }
]

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const supabase = createServiceClient()

  // --- GET: List or Retrieve Projects ---
  if (req.method === 'GET') {
    try {
      const { id, challenge_id, team_id, status } = req.query || {}

      let dbProjects = []
      try {
        let query = supabase
          .from('projects')
          .select(`
            id,
            challenge_id,
            team_id,
            mentor_id,
            status,
            trl_stage,
            start_date,
            created_at,
            updated_at,
            challenges ( id, title, description, trl_stage, status ),
            teams ( id, name, lead_user_id, team_members ( id, user_id, role, users ( email, role ) ) ),
            milestones ( id, title, description, status, due_date, evidence_url, reviewed_at, created_at )
          `)
          .order('created_at', { ascending: false })

        if (id) query = query.eq('id', id)
        if (challenge_id) query = query.eq('challenge_id', challenge_id)
        if (team_id) query = query.eq('team_id', team_id)
        if (status) query = query.eq('status', status.toUpperCase())

        const { data, error } = await query
        if (!error && data && data.length > 0) {
          dbProjects = data
        }
      } catch (dbErr) {
        console.warn('[Projects API] Supabase query bypassed or failed:', dbErr.message)
      }

      // Combine dynamic in-memory creations + default fallbacks + dbProjects
      const combinedPool = [...DYNAMIC_PROJECTS, ...DEFAULT_PROJECTS]

      let formatted = []
      if (dbProjects.length > 0) {
        formatted = dbProjects.map((proj) => {
          const milestones = (proj.milestones || []).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          const totalMilestones = milestones.length
          const completedMilestones = milestones.filter(
            (m) => m.status === 'COMPLETED' || m.status === 'PASSED'
          ).length
          const progressPercent = totalMilestones > 0
            ? Math.round((completedMilestones / totalMilestones) * 100)
            : proj.status === 'COMPLETED' ? 100 : proj.status === 'ACTIVE' ? 25 : 0

          return {
            id: proj.id,
            challenge_id: proj.challenge_id,
            challenge_title: proj.challenges?.title || 'Civic Innovation Challenge',
            challenge_description: proj.challenges?.description || '',
            team_id: proj.team_id,
            team_name: proj.teams?.name || 'Innovation Team',
            lead_user_id: proj.teams?.lead_user_id,
            members: (proj.teams?.team_members || []).map((tm) => ({
              user_id: tm.user_id,
              email: tm.users?.email || 'student@demo.ac.in',
              role: tm.role,
            })),
            members_count: (proj.teams?.team_members || []).length || 3,
            mentor_id: proj.mentor_id,
            mentor_name: 'Dr. Anjali Kumar (Faculty Mentor)',
            status: proj.status,
            trl_stage: proj.trl_stage || 4,
            stage_label: proj.status === 'COMPLETED' ? 'DEPLOYED' : 'PROTOTYPE',
            start_date: proj.start_date,
            created_at: proj.created_at,
            updated_at: proj.updated_at,
            milestones,
            milestones_count: totalMilestones,
            completed_milestones_count: completedMilestones,
            progress_percent: progressPercent,
          }
        })
      }

      // Merge with default/dynamic fallbacks ensuring no duplicate IDs
      for (const item of combinedPool) {
        if (!formatted.some((p) => p.id === item.id)) {
          formatted.push(item)
        }
      }

      // Apply client filtering if query params specified
      if (id) formatted = formatted.filter((p) => p.id === id)
      if (challenge_id) formatted = formatted.filter((p) => p.challenge_id === challenge_id)
      if (team_id) formatted = formatted.filter((p) => p.team_id === team_id)
      if (status) formatted = formatted.filter((p) => p.status.toUpperCase() === status.toUpperCase())

      res.status(200).json({ success: true, projects: formatted })
      return
    } catch (err) {
      console.error('[API Projects GET Exception]:', err)
      res.status(200).json({ success: true, projects: DEFAULT_PROJECTS })
      return
    }
  }

  // --- POST: Create Project from Approved Proposal ---
  if (req.method === 'POST') {
    try {
      const {
        challenge_id,
        challenge_title,
        challenge_description,
        team_id,
        team_name,
        proposal_id,
        proposal_title,
        mentor_id,
        mentor_name,
      } = req.body || {}

      const newId = `proj-${Date.now()}`
      const newProject = {
        id: newId,
        challenge_id: challenge_id || 'ch-water-gumla',
        challenge_title: challenge_title || proposal_title || 'Drinking Water Quality & Heavy Metal Filtration',
        challenge_description: challenge_description || 'High-capacity community water filtration prototype with IoT telemetry.',
        team_id: team_id || 'team-aquasense',
        team_name: team_name || 'Team AquaSense',
        lead_user_id: 'demo-user-student-003',
        members: [
          { user_id: 'demo-user-student-003', email: 'student@demo.ac.in', role: 'Team Lead' },
          { user_id: 'student-2', email: 'iot.lead@bitmesra.ac.in', role: 'IoT Hardware Lead' }
        ],
        members_count: 2,
        mentor_id: mentor_id || 'demo-user-admin-002',
        mentor_name: mentor_name || 'Dr. Anjali Kumar (Faculty Mentor, Ranchi University)',
        partner_name: 'Jharkhand State Water Mission',
        status: 'ACTIVE',
        trl_stage: 3,
        stage_label: 'LAB VALIDATION',
        start_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        progress_percent: 25,
        milestones_count: 4,
        completed_milestones_count: 1,
        milestones: [
          {
            id: `m-${Date.now()}-1`,
            title: 'Phase 1: Prototype Architecture & Bill of Materials Approval',
            description: 'Finalize component schematics and lab safety compliance specs.',
            status: 'COMPLETED',
            due_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
            evidence_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
            created_at: new Date().toISOString(),
          },
          {
            id: `m-${Date.now()}-2`,
            title: 'Phase 2: Filtration Chamber Fabrication & Sensor Calibration',
            description: 'Assemble physical filter vessel and integrate real-time pH/fluoride sensor micro-controller.',
            status: 'UNDER_REVIEW',
            due_date: new Date(Date.now() + 86400000 * 21).toISOString().split('T')[0],
            evidence_url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
            created_at: new Date().toISOString(),
          },
          {
            id: `m-${Date.now()}-3`,
            title: 'Phase 3: Gumla District Village Field Pilot Deployment',
            description: 'Deploy hardware node at primary school borewell and monitor 14-day water purity log.',
            status: 'NOT_STARTED',
            due_date: new Date(Date.now() + 86400000 * 45).toISOString().split('T')[0],
            evidence_url: null,
            created_at: new Date().toISOString(),
          },
          {
            id: `m-${Date.now()}-4`,
            title: 'Phase 4: Water Mission Scaled Commissioning & Final Report',
            description: 'Hand over operational maintenance documentation to local Panchayat water committee.',
            status: 'NOT_STARTED',
            due_date: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0],
            evidence_url: null,
            created_at: new Date().toISOString(),
          }
        ],
        decision: 'APPROVED',
        evaluator_feedback: 'Proposal approved by Ranchi University Faculty Panel. Project initiated.'
      }

      DYNAMIC_PROJECTS.unshift(newProject)

      // Try inserting into Supabase if connected
      try {
        await supabase.from('projects').insert({
          id: newId,
          challenge_id: newProject.challenge_id,
          team_id: newProject.team_id,
          mentor_id: newProject.mentor_id,
          status: 'ACTIVE',
          trl_stage: 3,
          start_date: newProject.start_date,
        })
      } catch (dbErr) {
        console.warn('[Projects API POST] Supabase insert fallback to in-memory:', dbErr.message)
      }

      res.status(201).json({ success: true, project: newProject })
      return
    } catch (err) {
      console.error('[API Projects POST Exception]:', err)
      res.status(500).json({ error: err.message || 'Internal Server Error' })
      return
    }
  }

  // --- PATCH: Update Project Status or Milestones ---
  if (req.method === 'PATCH') {
    try {
      const { id, status, trl_stage, mentor_id } = req.body || {}

      if (!id) {
        res.status(400).json({ error: 'Project ID is required' })
        return
      }

      // Check dynamic & default memory pools
      const target = DYNAMIC_PROJECTS.find((p) => p.id === id) || DEFAULT_PROJECTS.find((p) => p.id === id)
      if (target) {
        if (status) target.status = status.toUpperCase()
        if (trl_stage) target.trl_stage = trl_stage
        if (mentor_id) target.mentor_id = mentor_id
        if (status === 'COMPLETED') {
          target.stage_label = 'DEPLOYED'
          target.progress_percent = 100
        }
        target.updated_at = new Date().toISOString()
      }

      try {
        const updates = { updated_at: new Date().toISOString() }
        if (status) updates.status = status.toUpperCase()
        if (trl_stage) updates.trl_stage = trl_stage
        if (mentor_id) updates.mentor_id = mentor_id

        await supabase.from('projects').update(updates).eq('id', id)
      } catch (dbErr) {
        console.warn('[Projects API PATCH] Supabase update fallback to memory:', dbErr.message)
      }

      res.status(200).json({ success: true, project: target || { id, status } })
      return
    } catch (err) {
      console.error('[API Projects PATCH Exception]:', err)
      res.status(500).json({ error: err.message || 'Internal Server Error' })
      return
    }
  }

  res.status(405).json({ error: `Method ${req.method} not allowed` })
}

