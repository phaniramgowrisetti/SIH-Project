import healthHandler from '../api_backend/health.js';
import submissionsIndexHandler from '../api_backend/submissions/index.js';
import submissionsConfirmHandler from '../api_backend/submissions/confirm.js';
import submissionsSimilarHandler from '../api_backend/submissions/similar.js';
import aiUnderstandHandler from '../api_backend/ai/understand.js';
import aiEmbedHandler from '../api_backend/ai/embed.js';
import aiTranscribeHandler from '../api_backend/ai/transcribe.js';
import aiStatusHandler from '../api_backend/ai/status.js';
import clustersIndexHandler from '../api_backend/clusters/index.js';
import clustersRunHandler from '../api_backend/clusters/run.js';
import clustersValidateHandler from '../api_backend/clusters/validate.js';
import challengesIndexHandler from '../api_backend/challenges/index.js';
import teamsIndexHandler from '../api_backend/teams/index.js';
import teamsJoinHandler from '../api_backend/teams/join.js';
import proposalsIndexHandler from '../api_backend/proposals/index.js';
import proposalsReviewHandler from '../api_backend/proposals/review.js';
import projectsIndexHandler from '../api_backend/projects/index.js';
import projectsMilestoneHandler from '../api_backend/projects/milestone.js';
import collaborationsIndexHandler from '../api_backend/collaborations/index.js';
import partnerIndexHandler from '../api_backend/partner/index.js';
import adminDashboardHandler from '../api_backend/admin/dashboard.js';
import adminAnalyticsHandler from '../api_backend/admin/analytics.js';
import adminTraceHandler from '../api_backend/admin/trace.js';
import adminAssignHandler from '../api_backend/admin/assign.js';
import adminUniversityRequestsHandler from '../api_backend/admin/university-requests.js';
import adminUniversityRequestsRespondHandler from '../api_backend/admin/university-requests/respond.js';
import adminSeedHandler from '../api_backend/admin/seed.js';
import adminResetHandler from '../api_backend/admin/reset.js';

export default async function handler(req, res) {
  // Normalize path from query or URL
  const rawUrl = req.url || '';
  const urlPath = rawUrl.split('?')[0];

  try {
    if (urlPath === '/api/health' || urlPath === '/health') {
      return await healthHandler(req, res);
    }
    if (urlPath === '/api/submissions/confirm' || urlPath === '/submissions/confirm') {
      return await submissionsConfirmHandler(req, res);
    }
    if (urlPath.includes('/submissions/') && urlPath.endsWith('/similar')) {
      return await submissionsSimilarHandler(req, res);
    }
    if (urlPath === '/api/submissions' || urlPath === '/submissions') {
      return await submissionsIndexHandler(req, res);
    }

    if (urlPath === '/api/ai/understand' || urlPath === '/ai/understand') {
      return await aiUnderstandHandler(req, res);
    }
    if (urlPath === '/api/ai/embed' || urlPath === '/ai/embed') {
      return await aiEmbedHandler(req, res);
    }
    if (urlPath === '/api/ai/transcribe' || urlPath === '/ai/transcribe') {
      return await aiTranscribeHandler(req, res);
    }
    if (urlPath === '/api/ai/status' || urlPath === '/ai/status') {
      return await aiStatusHandler(req, res);
    }

    if (urlPath === '/api/clusters/run' || urlPath === '/clusters/run') {
      return await clustersRunHandler(req, res);
    }
    if (urlPath === '/api/clusters/validate' || urlPath === '/clusters/validate') {
      return await clustersValidateHandler(req, res);
    }
    if (urlPath === '/api/clusters' || urlPath === '/clusters') {
      return await clustersIndexHandler(req, res);
    }

    if (urlPath.startsWith('/api/challenges') || urlPath.startsWith('/challenges')) {
      return await challengesIndexHandler(req, res);
    }

    if (urlPath === '/api/teams/join' || urlPath === '/teams/join') {
      return await teamsJoinHandler(req, res);
    }
    if (urlPath.startsWith('/api/teams') || urlPath.startsWith('/teams')) {
      return await teamsIndexHandler(req, res);
    }

    if (urlPath === '/api/proposals/review' || urlPath === '/proposals/review') {
      return await proposalsReviewHandler(req, res);
    }
    if (urlPath.startsWith('/api/proposals') || urlPath.startsWith('/proposals')) {
      return await proposalsIndexHandler(req, res);
    }

    if (urlPath === '/api/projects/milestone' || urlPath === '/projects/milestone') {
      return await projectsMilestoneHandler(req, res);
    }
    if (urlPath.startsWith('/api/projects') || urlPath.startsWith('/projects')) {
      return await projectsIndexHandler(req, res);
    }

    if (urlPath === '/api/collaborations' || urlPath === '/collaborations') {
      return await collaborationsIndexHandler(req, res);
    }

    if (urlPath === '/api/partner' || urlPath === '/partner') {
      return await partnerIndexHandler(req, res);
    }

    if (urlPath === '/api/admin/dashboard' || urlPath === '/admin/dashboard') {
      return await adminDashboardHandler(req, res);
    }
    if (urlPath === '/api/admin/analytics' || urlPath === '/admin/analytics') {
      return await adminAnalyticsHandler(req, res);
    }
    if (urlPath === '/api/admin/trace' || urlPath === '/admin/trace') {
      return await adminTraceHandler(req, res);
    }
    if (urlPath === '/api/admin/assign' || urlPath === '/admin/assign') {
      return await adminAssignHandler(req, res);
    }
    if (urlPath === '/api/admin/university-requests/respond' || urlPath === '/admin/university-requests/respond') {
      return await adminUniversityRequestsRespondHandler(req, res);
    }
    if (urlPath === '/api/admin/university-requests' || urlPath === '/admin/university-requests') {
      return await adminUniversityRequestsHandler(req, res);
    }
    if (urlPath === '/api/admin/seed' || urlPath === '/admin/seed') {
      return await adminSeedHandler(req, res);
    }
    if (urlPath === '/api/admin/reset' || urlPath === '/admin/reset') {
      return await adminResetHandler(req, res);
    }

    return res.status(404).json({ error: 'Endpoint not found', path: urlPath });
  } catch (err) {
    console.error('API Error in consolidated handler:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
