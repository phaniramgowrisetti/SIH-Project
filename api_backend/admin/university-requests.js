import { createServiceClient } from '../lib/supabase.js'

// Persistent in-memory & fallback request store for demo environment
const globalRequestsStore = globalThis.__samadhan_university_requests || new Map()
globalThis.__samadhan_university_requests = globalRequestsStore

// Supported Jharkhand Universities database
const DEMO_UNIVERSITIES = [
  {
    id: '2b79fc24-8235-48a1-989f-2eee0a4bffc2',
    name: 'Ranchi University',
    type: 'State Public University',
    location: 'Ranchi, Jharkhand',
    fitScore: 96,
    expertise: 'Water Quality Testing, Environmental Chemistry, Community Hydrology',
    disciplines: 'Environmental Engineering & Public Health',
    email: 'faculty@demo.ac.in',
  },
  {
    id: 'bit_mesra',
    name: 'Birla Institute of Technology (BIT Mesra)',
    type: 'Deemed University',
    location: 'Mesra, Ranchi, Jharkhand',
    fitScore: 92,
    expertise: 'Membrane Filtration, Wastewater Treatment, IOT Water Sensors',
    disciplines: 'Chemical & Civil Engineering',
    email: 'faculty@mesra.ac.in',
  },
  {
    id: 'iit_dhanbad',
    name: 'IIT (ISM) Dhanbad',
    type: 'Institute of National Importance',
    location: 'Dhanbad, Jharkhand',
    fitScore: 88,
    expertise: 'Heavy Metal Remediation, Groundwater Contamination, Sensors',
    disciplines: 'Environmental Science & Mining R&D',
    email: 'env@iitism.ac.in',
  },
  {
    id: 'nit_jamshedpur',
    name: 'NIT Jamshedpur',
    type: 'Institute of National Importance',
    location: 'Jamshedpur, Jharkhand',
    fitScore: 85,
    expertise: 'Low-Cost Filtration, Rural Infrastructure, Bio-Remediation',
    disciplines: 'Civil Engineering & Sanitation',
    email: 'civil@nitjsr.ac.in',
  },
  {
    id: 'vbu_hazaribag',
    name: 'Vinoba Bhave University (VBU Hazaribag)',
    type: 'State University',
    location: 'Hazaribag, Jharkhand',
    fitScore: 81,
    expertise: 'Soil & Water Testing, Community Public Health',
    disciplines: 'Botany & Environmental Sciences',
    email: 'env@vbu.ac.in',
  },
  {
    id: 'skmu_dumka',
    name: 'Sido Kanhu Murmu University (SKMU)',
    type: 'State Public University',
    location: 'Dumka, Santhal Pargana',
    fitScore: 78,
    expertise: 'Tribal Resource Management, Rural Water Systems',
    disciplines: 'Rural R&D & Life Sciences',
    email: 'research@skmu.ac.in',
  },
  {
    id: 'ru_polytechnic',
    name: 'Government Polytechnic Ranchi',
    type: 'State Technical Institute',
    location: 'Ranchi, Jharkhand',
    fitScore: 75,
    expertise: 'Hardware Assembly, Filter Maintenance, Plumbing Prototyping',
    disciplines: 'Mechanical & Civil Engineering',
    email: 'polytechnic@ranchi.gov.in',
  },
  {
    id: 'bau_kanke',
    name: 'Birsa Agricultural University (BAU Kanke)',
    type: 'State Agricultural University',
    location: 'Kanke, Ranchi',
    fitScore: 74,
    expertise: 'Agricultural Water Runoff, Pesticide Testing, Soil Science',
    disciplines: 'Agricultural Engineering',
    email: 'water@baukanke.ac.in',
  }
]

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

  // 1. GET /api/admin/university-requests — Fetch requests and statuses for a problem
  if (req.method === 'GET') {
    try {
      let problemId = req.query?.problemId || req.query?.id
      if (!problemId || problemId === '00000000-0000-0000-0002-000000000001') {
        problemId = globalThis.__samadhan_latest_dispatched_problem_id || '00000000-0000-0000-0002-000000000001'
      }

      let storedMap = globalRequestsStore.get(problemId)
      if ((!storedMap || storedMap.size === 0) && globalRequestsStore.size > 0) {
        // Fallback to latest stored problem in memory
        const keys = Array.from(globalRequestsStore.keys())
        const lastKey = keys[keys.length - 1]
        storedMap = globalRequestsStore.get(lastKey)
        problemId = lastKey
      }

      const requests = storedMap ? Array.from(storedMap.values()) : []

      const summary = {
        total: requests.length,
        sent: requests.filter((r) => r.status === 'REQUEST_SENT').length,
        accepted: requests.filter((r) => r.status === 'ACCEPTED').length,
        pending: requests.filter((r) => r.status === 'PENDING' || r.status === 'REQUEST_SENT').length,
        declined: requests.filter((r) => r.status === 'DECLINED').length,
      }

      res.status(200).json({
        success: true,
        problemId,
        universities: DEMO_UNIVERSITIES,
        requests,
        summary,
      })
    } catch (err) {
      console.error('[API University Requests GET Error]:', err)
      res.status(500).json({ error: err.message })
    }
    return
  }

  // 2. POST /api/admin/university-requests — Dispatch requests to multiple universities
  if (req.method === 'POST') {
    try {
      const {
        problemId = '00000000-0000-0000-0002-000000000001',
        universityIds = [],
      } = req.body || {}

      if (!Array.isArray(universityIds) || universityIds.length === 0) {
        res.status(400).json({ error: 'universityIds must be a non-empty array' })
        return
      }

      let storedMap = globalRequestsStore.get(problemId)
      if (!storedMap) {
        storedMap = new Map()
        globalRequestsStore.set(problemId, storedMap)
      }

      const sent = []
      const failed = []

      for (const univId of universityIds) {
        const univObj = DEMO_UNIVERSITIES.find((u) => u.id === univId)
        if (!univObj) {
          failed.push({ universityId: univId, reason: 'University not found' })
          continue
        }

        const reqRecord = {
          problemId,
          universityId: univObj.id,
          universityName: univObj.name,
          facultyEmail: univObj.email,
          fitScore: univObj.fitScore,
          expertise: univObj.expertise,
          disciplines: univObj.disciplines,
          status: 'REQUEST_SENT',
          updatedAt: new Date().toISOString(),
        }

        storedMap.set(univObj.id, reqRecord)
        sent.push({ universityId: univObj.id, universityName: univObj.name, status: 'REQUEST_SENT' })
      }

      // Sync Supabase problem_specifications and challenges tables
      try {
        await supabase
          .from('problem_specifications')
          .update({
            status: 'REQUEST_SENT',
            human_verification_status: 'REQUEST_SENT',
            updated_at: new Date().toISOString(),
          })
          .eq('cluster_id', problemId)

        await supabase
          .from('challenges')
          .update({
            status: 'MATCHING',
            updated_at: new Date().toISOString(),
          })
          .limit(1)
      } catch (dbErr) {
        console.warn('[Supabase Sync Warning]:', dbErr.message)
      }

      const summary = {
        total: storedMap.size,
        sent: Array.from(storedMap.values()).filter((r) => r.status === 'REQUEST_SENT').length,
        accepted: Array.from(storedMap.values()).filter((r) => r.status === 'ACCEPTED').length,
        pending: Array.from(storedMap.values()).filter((r) => r.status === 'PENDING' || r.status === 'REQUEST_SENT').length,
        declined: Array.from(storedMap.values()).filter((r) => r.status === 'DECLINED').length,
      }

      res.status(200).json({
        success: true,
        message: `Requests dispatched to ${sent.length} universities successfully.`,
        sent,
        failed,
        summary,
      })
    } catch (err) {
      console.error('[API University Requests POST Error]:', err)
      res.status(500).json({ error: err.message || 'Failed to dispatch university requests' })
    }
    return
  }

  res.status(405).json({ error: `Method ${req.method} not allowed` })
}
