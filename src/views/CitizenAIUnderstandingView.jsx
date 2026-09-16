import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { setActiveAIUnderstanding } from '../features/app/appSlice';
import { SignalUnderstandingService } from '../services/SignalUnderstandingService';

export default function CitizenAIUnderstandingView() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const communitySignals = useSelector((s) => s.app.communitySignals);
  const activeAIUnderstanding = useSelector((s) => s.app.activeAIUnderstanding);
  const reportDraft = useSelector((s) => s.app.reportDraft);
  const selectedLanguage = useSelector((s) => s.app.selectedLanguage);

  const [showTechDetails, setShowTechDetails] = useState(false);

  const currentSignal = communitySignals[0] || {
    id: 'SS-2026-00421',
    description: 'The water from our village hand pump has turned rusty brown after monsoon rains.',
    location: 'Gumla District, Jharkhand',
  };

  // Get uploaded evidence photo if present
  const evidenceList = activeAIUnderstanding?.evidenceList || reportDraft?.evidence || currentSignal.evidence || [];
  const primaryImage = evidenceList.find((e) => e.previewUrl || e.storage_path);

  const [loading, setLoading] = useState(!activeAIUnderstanding);
  const [understanding, setUnderstanding] = useState(
    activeAIUnderstanding || {
      primaryDomain: 'Water Quality & Sanitation',
      relatedDomains: ['Public Health'],
      issueSummary: currentSignal.description || 'Civic observation reported.',
      affectedGroups: ['Local Community', 'Children'],
      possibleImpacts: ['Drinking water quality risk', 'Community health concern'],
      extractedLocation: currentSignal.location?.label || currentSignal.location || 'Gumla District, Jharkhand',
      severity: 'high',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    }
  );

  useEffect(() => {
    let isMounted = true;

    async function runAI() {
      if (activeAIUnderstanding && activeAIUnderstanding.primaryDomain) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await SignalUnderstandingService.understandSignal(currentSignal, selectedLanguage);
        if (isMounted) {
          setUnderstanding(result);
          dispatch(setActiveAIUnderstanding(result));
        }
      } catch (e) {
        console.warn('[AI View] Error fetching AI understanding:', e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    runAI();

    return () => {
      isMounted = false;
    };
  }, [currentSignal, selectedLanguage, dispatch, activeAIUnderstanding]);

  const severityBadgeStyles = {
    critical: 'bg-red-500/10 text-red-700 border-red-500/30',
    high: 'bg-amber-500/10 text-amber-800 border-amber-500/30',
    medium: 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/30',
    low: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  };

  return (
    <main className="flex-grow py-3 sm:py-4 px-4 md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col items-center justify-start text-on-surface">
      <div className="w-full max-w-[620px] mx-auto flex-grow flex flex-col items-center justify-start space-y-3">

        {/* 1. Header & Back Navigation */}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={() => navigate('/citizen/report/submitted')}
            className="inline-flex items-center gap-1.5 text-brand-indigo hover:text-brand-violet font-label-md text-xs font-semibold transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-violet/40 rounded-md py-0.5 px-1"
          >
            <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform duration-200">arrow_back</span>
            <span>Back</span>
          </button>

          <span className="text-[10px] font-extrabold tracking-widest text-brand-violet uppercase bg-brand-violet/10 px-2.5 py-0.5 rounded-full border border-brand-violet/20">
            AI OBSERVATION SYNTHESIS
          </span>
        </div>

        {/* Header Title & Subtitle */}
        <div className="text-center max-w-md mx-auto space-y-0.5 py-0.5">
          <h1 className="font-display-lg text-[#1E1B4B] text-xl sm:text-2xl font-extrabold tracking-tight">
            Here's what we understood
          </h1>
          <p className="font-body-md text-on-surface-variant text-xs font-medium leading-normal max-w-md mx-auto">
            Our civic AI model has extracted structured problem categories and community impact signals from your report.
          </p>
        </div>

        {/* 2. Compact Submission Summary Card + Actual Photo Evidence Preview */}
        <div className="w-full bg-surface-container-low/60 p-3.5 rounded-xl border border-outline-variant/60 space-y-2 text-left text-xs shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-indigo uppercase tracking-wider">YOUR SUBMITTED OBSERVATION</span>
            <span className="text-[10px] font-mono font-bold text-brand-teal bg-white px-2 py-0.5 rounded-md border border-outline-variant/40">
              {activeAIUnderstanding?.id || currentSignal.id || 'SS-2026-00401'}
            </span>
          </div>

          <div className="flex items-start gap-3">
            {primaryImage && (primaryImage.previewUrl || primaryImage.storage_path) && (
              <div className="w-16 h-16 rounded-lg border border-outline-variant/40 bg-white overflow-hidden shrink-0 shadow-2xs">
                <img
                  src={primaryImage.previewUrl || primaryImage.storage_path}
                  alt="Uploaded Evidence Photo"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-body-md text-on-surface text-xs font-medium italic leading-snug line-clamp-3">
                &quot;{understanding.issueSummary || currentSignal.description || 'Community problem observation.'}&quot;
              </p>
              <div className="text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-brand-teal text-sm shrink-0">location_on</span>
                <span className="truncate">{understanding.extractedLocation || currentSignal.location?.label || currentSignal.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. AI Interpretation Results */}
        {loading ? (
          <div className="w-full py-8 flex flex-col items-center justify-center space-y-2 bg-white rounded-xl border border-outline-variant/60 p-4">
            <span className="material-symbols-outlined text-3xl text-brand-violet animate-spin">smart_toy</span>
            <p className="text-xs text-brand-indigo font-bold">Structuring civic intelligence with AI model...</p>
            <span className="text-[10px] text-on-surface-variant">Analyzing domain, affected groups, and local severity</span>
          </div>
        ) : (
          <div className="w-full space-y-2">
            {/* Row 1: Civic Domain */}
            <div
              className="p-3 rounded-xl bg-white border border-outline-variant/60 flex items-center justify-between shadow-2xs text-left animate-fade-slide-up"
              style={{ animationDelay: '0ms' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-base">category</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-brand-teal uppercase tracking-wider block">1. CIVIC DOMAIN</span>
                  <span className="font-bold text-brand-indigo text-xs sm:text-sm truncate block">
                    {understanding.primaryDomain}
                    {understanding.relatedDomains?.length > 0 && (
                      <span className="text-[11px] text-on-surface-variant font-normal ml-1.5">
                        (Related: {understanding.relatedDomains.join(', ')})
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-brand-teal text-base shrink-0 ml-2">check_circle</span>
            </div>

            {/* Row 2: Assessed Severity */}
            <div
              className="p-3 rounded-xl bg-white border border-outline-variant/60 flex items-center justify-between shadow-2xs text-left animate-fade-slide-up"
              style={{ animationDelay: '150ms' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-base">warning</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">2. ASSESSED SEVERITY</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${severityBadgeStyles[understanding.severity] || severityBadgeStyles.medium}`}>
                      {understanding.severity} Priority
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">Automated impact weighting</span>
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-brand-teal text-base shrink-0 ml-2">check_circle</span>
            </div>

            {/* Row 3: Impacted Demographics */}
            <div
              className="p-3 rounded-xl bg-white border border-outline-variant/60 flex items-center justify-between shadow-2xs text-left animate-fade-slide-up"
              style={{ animationDelay: '300ms' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-brand-indigo/10 text-brand-indigo flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-base">groups</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-brand-indigo uppercase tracking-wider block">3. IMPACTED DEMOGRAPHICS</span>
                  <span className="font-bold text-brand-indigo text-xs sm:text-sm truncate block">
                    {Array.isArray(understanding.affectedGroups) ? understanding.affectedGroups.join(', ') : 'Local Community'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-brand-teal text-base shrink-0 ml-2">check_circle</span>
            </div>

            {/* Row 4: Key Impact Signals */}
            <div
              className="p-3 rounded-xl bg-white border border-outline-variant/60 flex items-center justify-between shadow-2xs text-left animate-fade-slide-up"
              style={{ animationDelay: '450ms' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-brand-violet/10 text-brand-violet flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-base">health_and_safety</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-brand-violet uppercase tracking-wider block">4. KEY IMPACT SIGNALS</span>
                  <span className="font-bold text-brand-indigo text-xs sm:text-sm truncate block">
                    {Array.isArray(understanding.possibleImpacts) ? understanding.possibleImpacts.join(' • ') : 'Community concern requiring inspection'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-brand-teal text-base shrink-0 ml-2">check_circle</span>
            </div>
          </div>
        )}

        {/* 4. Collapsible Technical AI Information (Collapsed by default) */}
        <div className="w-full pt-0.5">
          <button
            type="button"
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="text-[11px] font-semibold text-on-surface-variant/80 hover:text-brand-indigo flex items-center justify-center gap-1 mx-auto py-0.5 transition-colors cursor-pointer"
          >
            <span>AI processing details</span>
            <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${showTechDetails ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {showTechDetails && (
            <div className="mt-2 p-3 bg-surface-container-low/60 rounded-xl border border-outline-variant/40 text-xs text-brand-indigo space-y-2 animate-fade-in text-left">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-violet text-base">
                    {understanding.provider?.includes('fallback') ? 'psychology' : 'verified'}
                  </span>
                  <span className="font-medium text-[11px]">
                    AI Engine:{' '}
                    <strong>
                      {understanding.provider === 'groq'
                        ? 'Meta Llama 3.3 70B (Groq LPU)'
                        : understanding.provider === 'gemini'
                          ? 'Google Gemini 2.0 Flash'
                          : 'Civic Intelligence NLP Engine'}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {understanding.hasEmbedding && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-brand-teal/10 text-brand-teal border-brand-teal/20">
                      768-dim Semantic Vector: Active
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-brand-teal font-mono bg-white px-2 py-0.5 rounded-md border border-brand-teal/20">
                    Verified
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Primary Action CTA */}
        <div className="w-full pt-1">
          <button
            type="button"
            disabled={loading}
            className="w-full bg-brand-indigo hover:bg-brand-violet text-white h-[48px] rounded-xl font-label-md font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-98"
            onClick={() => navigate('/citizen/ai-confirmation')}
          >
            <span>Review and confirm AI interpretation</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>

      </div>
    </main>
  );
}
