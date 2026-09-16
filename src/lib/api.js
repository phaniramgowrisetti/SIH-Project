/**
 * SamadhanSetu API Client
 * Calls Vercel Serverless Functions at /api/*
 */

const API_BASE = '/api'

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  return response.json()
}

// --- Submissions ---
export const api = {
  // Health check
  health: () => request('/health'),

  // Submissions
  createSubmission: (data) => request('/submissions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getSubmissions: (params = '') => request(`/submissions${params ? '?' + params : ''}`),
  getSubmission: (id) => request(`/submissions?id=${encodeURIComponent(id)}`),
  getSubmissionById: (idOrRef) => request(`/submissions?id=${encodeURIComponent(idOrRef)}`),
  confirmSubmission: (payload) => request('/submissions/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getSimilarSubmissions: (id) => request(`/submissions/${id}/similar`),

  // AI Pipeline
  understand: (data) => request('/ai/understand', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  embed: (data) => request('/ai/embed', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  transcribe: (data) => request('/ai/transcribe', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  aiStatus: () => request('/ai/status'),

  // Clusters
  getClusters: (params = '') => request(`/clusters${params ? '?' + params : ''}`),
  getCluster: (id) => request(`/clusters?id=${encodeURIComponent(id)}`),
  runClustering: () => request('/clusters/run', { method: 'POST' }),
  validateCluster: (clusterIdOrPayload, data = {}) => {
    const payload = typeof clusterIdOrPayload === 'string'
      ? { cluster_id: clusterIdOrPayload, ...data }
      : clusterIdOrPayload
    return request('/clusters/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Challenges
  getChallenges: (params = '') => request(`/challenges${params ? '?' + params : ''}`),
  getChallenge: (id) => request(`/challenges?id=${encodeURIComponent(id)}`),
  createChallenge: (data) => request('/challenges', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateChallenge: (id, data) => request(`/challenges/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Teams
  getTeams: (params = '') => request(`/teams${params ? '?' + params : ''}`),
  getTeam: (id) => request(`/teams?id=${encodeURIComponent(id)}`),
  createTeam: (data) => request('/teams', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  joinTeam: (data) => request('/teams/join', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Proposals
  getProposals: (params = '') => request(`/proposals${params ? '?' + params : ''}`),
  getProposal: (id) => request(`/proposals?id=${encodeURIComponent(id)}`),
  createProposal: (data) => request('/proposals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  reviewProposal: (idOrPayload, data = {}) => {
    const payload = typeof idOrPayload === 'string'
      ? { proposal_id: idOrPayload, ...data }
      : idOrPayload
    return request('/proposals/review', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Projects & Milestones
  getProjects: (params = '') => request(`/projects${params ? '?' + params : ''}`),
  getProject: (id) => request(`/projects?id=${encodeURIComponent(id)}`),
  createProject: (data) => request('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateProject: (idOrPayload, data = {}) => {
    const payload = typeof idOrPayload === 'string'
      ? { id: idOrPayload, ...data }
      : idOrPayload
    return request('/projects', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  updateMilestone: (data) => request('/projects/milestone', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Collaborations
  getCollaborations: (params = '') => request(`/collaborations${params ? '?' + params : ''}`),
  requestCollaboration: (data) => request('/collaborations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Admin & University Handoff
  getDashboard: () => request('/admin/dashboard'),
  getAnalytics: () => request('/admin/analytics'),
  getProblemTrace: (id) => request(`/admin/trace?id=${encodeURIComponent(id)}`),
  assignUniversity: (data) => request('/admin/assign', { method: 'POST', body: JSON.stringify(data) }),
  acceptUniversityRequest: (data) => request('/admin/assign', { method: 'POST', body: JSON.stringify(data) }),
  getUniversityRequests: (problemId) => request(`/admin/university-requests?problemId=${encodeURIComponent(problemId || '')}`),
  sendUniversityRequests: (data) => request('/admin/university-requests', { method: 'POST', body: JSON.stringify(data) }),
  respondUniversityRequest: (data) => request('/admin/university-requests/respond', { method: 'POST', body: JSON.stringify(data) }),
  seedDemo: () => request('/admin/seed', { method: 'POST' }),
  //   resetDemo: () => request('/admin/reset', { method: 'POST' }),
}

