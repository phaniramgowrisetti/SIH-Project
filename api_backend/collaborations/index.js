import { createServiceClient } from '../lib/supabase.js'

// In-memory local collaboration requests store
const DYNAMIC_COLLABORATIONS = []

// Baseline collaboration partners & active requests
const DEFAULT_PARTNERS = [
  {
    id: 'partner-water-mission',
    organization_name: 'Jharkhand State Water Mission',
    category: 'GOVERNMENT',
    badge: 'Govt Mission',
    contact_person: 'Er. Rajesh Varma (Director of Rural Water Ops)',
    email: 'watermission.jh@gov.in',
    phone: '+91 651 2400112',
    location: 'Ranchi, Jharkhand',
    focus_domains: ['Water Purification', 'Fluoride Filtration', 'Rural IoT Monitoring'],
    expertise: 'Statewide water infrastructure funding, Panchayat permissions, field pilot testbeds.',
    project_fit: '98% Match for Drinking Water Quality & Heavy Metal Filtration',
    active_projects_count: 2,
    status: 'ACTIVE',
    match_score: 98,
  },
  {
    id: 'partner-tata-csr',
    organization_name: 'Tata Steel Foundation (CSR Innovation Fund)',
    category: 'CSR',
    badge: 'CSR Partner',
    contact_person: 'Sunita Murmu (CSR Programs Head)',
    email: 'csr.innovations@tatasteel.com',
    phone: '+91 657 2234000',
    location: 'Jamshedpur, Jharkhand',
    focus_domains: ['Clean Tech', 'Vocational Skill Tech', 'Rural Agri-tech'],
    expertise: 'Grant funding up to ₹25 Lakhs per prototype, pilot testing grounds, industry mentoring.',
    project_fit: '95% Match for Heavy Metal Filtration & Crop Disease Sensor',
    active_projects_count: 1,
    status: 'ACTIVE',
    match_score: 95,
  },
  {
    id: 'partner-kvk-simdega',
    organization_name: 'Simdega Krishi Vigyan Kendra (ICAR)',
    category: 'RESEARCH_LAB',
    badge: 'ICAR KVK Lab',
    contact_person: 'Dr. Rameshwar Mahto (Principal Scientist)',
    email: 'kvk.simdega@icar.gov.in',
    phone: '+91 6525 220044',
    location: 'Simdega, Jharkhand',
    focus_domains: ['Agronomy AI', 'Fungal Blight Diagnostics', 'Smallholder Extension'],
    expertise: 'Crop pathogen labs, 8 Panchayat test farms, farmer training extension network.',
    project_fit: '94% Match for Crop Disease Early Detection System',
    active_projects_count: 1,
    status: 'ACTIVE',
    match_score: 94,
  },
  {
    id: 'partner-aqua-tech-startup',
    organization_name: 'HydroPure Innovations (DeepTech Startup)',
    category: 'STARTUP',
    badge: 'Hardware Startup',
    contact_person: 'Vikramaditya Roy (Founder & CEO)',
    email: 'roy@hydropure.io',
    phone: '+91 98350 99881',
    location: 'BIT Mesra Incubator, Ranchi',
    focus_domains: ['Filter Manufacturing', 'IoT Telemetry Boards', 'Water Testing Kits'],
    expertise: 'CNC fabrication, PCB prototyping, supply chain scaling.',
    project_fit: '91% Match for Hardware Prototype Scaling',
    active_projects_count: 0,
    status: 'PROPOSED',
    match_score: 91,
  },
]

export default async function handler(req, res) {
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

  // GET: Fetch partners and active requests
  if (req.method === 'GET') {
    const { category, status } = req.query || {}

    let partners = [...DEFAULT_PARTNERS]
    if (category && category !== 'ALL') {
      partners = partners.filter((p) => p.category === category)
    }

    const requests = [...DYNAMIC_COLLABORATIONS]

    res.status(200).json({
      success: true,
      partners,
      requests,
      metrics: {
        total_partners: partners.length,
        active_collaborations: partners.filter((p) => p.status === 'ACTIVE').length,
        pending_requests: requests.filter((r) => r.status === 'PENDING').length,
        total_funding_allocated: '₹42,50,000',
      },
    })
    return
  }

  // POST: Request Collaboration
  if (req.method === 'POST') {
    const { partner_id, partner_name, project_id, project_title, request_notes } = req.body || {}

    const newRequest = {
      id: `collab-req-${Date.now()}`,
      partner_id: partner_id || 'partner-water-mission',
      partner_name: partner_name || 'Jharkhand State Water Mission',
      project_id: project_id || 'proj-water-aquasense',
      project_title: project_title || 'Drinking Water Quality & Heavy Metal Filtration',
      university_name: 'Ranchi University Innovation Hub',
      faculty_lead: 'Dr. Anjali Kumar',
      request_notes: request_notes || 'Requesting field pilot testbed authorization across Gumla district borewell nodes.',
      status: 'UNDER_REVIEW',
      created_at: new Date().toISOString(),
    }

    DYNAMIC_COLLABORATIONS.unshift(newRequest)

    res.status(201).json({
      success: true,
      message: 'Collaboration request submitted successfully to partner organization.',
      request: newRequest,
    })
    return
  }

  res.status(405).json({ error: `Method ${req.method} not allowed` })
}
