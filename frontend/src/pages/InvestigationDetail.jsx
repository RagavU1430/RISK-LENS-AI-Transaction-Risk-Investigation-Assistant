import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bot, Eye, X } from 'lucide-react'
import PageContainer from '../components/PageContainer.jsx'
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx'
import ErrorState from '../components/common/ErrorState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { FileSearch } from 'lucide-react'
import InvestigationHeader from '../components/investigations/InvestigationHeader.jsx'
import RiskSummary from '../components/investigations/RiskSummary.jsx'
import RuleFindingCard from '../components/investigations/RuleFindingCard.jsx'
import EvidenceTimeline from '../components/investigations/EvidenceTimeline.jsx'
import TransactionCluster from '../components/investigations/TransactionCluster.jsx'
import BehavioralBaseline from '../components/investigations/BehavioralBaseline.jsx'
import TraceabilityChain from '../components/investigations/TraceabilityChain.jsx'
import InvestigationNetwork3D from '../components/investigations/InvestigationNetwork3D.jsx'
import TransactionDetailModal from '../components/transactions/TransactionDetailModal.jsx'
import AiAnalysisPanel from '../components/AiAnalysisPanel.jsx'
import { getInvestigation } from '../lib/api.js'

export default function InvestigationDetail() {
  const { investigationId } = useParams()
  const [inv, setInv] = useState(null)
  const [state, setState] = useState('loading')
  const [selectedTx, setSelectedTx] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [regenKey, setRegenKey] = useState(0)
  const [showAiPopup, setShowAiPopup] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    try {
      setInv(await getInvestigation(investigationId))
      setState('done')
    } catch {
      setState('error')
    }
  }, [investigationId])

  useEffect(() => { load() }, [load])

  const handleAnalysis = useCallback((report) => setAnalysis(report), [])
  const handleSettled = useCallback(() => setRegenerating(false), [])
  const handleRegenerate = useCallback(() => {
    setRegenerating(true)
    setRegenKey((k) => k + 1)
  }, [])

  // lock background scroll when AI popup is open
  useEffect(() => {
    document.body.style.overflow = showAiPopup ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showAiPopup])

  useEffect(() => {
    if (!showAiPopup) return
    const onKey = (e) => { if (e.key === 'Escape') setShowAiPopup(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAiPopup])

  const pkgByFinding = Object.fromEntries((inv?.evidence_packages ?? []).map((p) => [p.finding_id, p]))

  return (
    <PageContainer
      eyebrow="Investigation"
      title={investigationId}
      description="Deterministic findings with evidence-grounded AI explanation."
    >
      {state === 'loading' && <LoadingSkeleton rows={8} />}
      {state === 'error' && <ErrorState onRetry={load} />}
      {state === 'done' && !inv && (
        <EmptyState icon={FileSearch} title="Investigation not found." description={`No investigation matches ${investigationId}.`} actionLabel="All investigations" actionTo="/investigations" />
      )}
      {state === 'done' && inv && (
        <div className="space-y-6">
          <InvestigationHeader
            investigation={inv}
            regenerating={regenerating}
            onRegenerate={handleRegenerate}
          />
          <RiskSummary investigation={inv} />

          {/* 3D Investigation network — depth + interactivity */}
          <InvestigationNetwork3D investigation={inv} onSelectTransaction={setSelectedTx} />

          <section aria-label="Triggered rules">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded-md bg-sky-500/10 border border-sky-500/25 text-sky-300">DETERMINISTIC</span>
              <h3 className="text-white font-semibold text-[15px]">Triggered Rules ({inv.findings?.length ?? 0})</h3>
            </div>
            <div className="space-y-3">
              {(inv.findings ?? []).map((f) => (
                <RuleFindingCard key={f.finding_id} finding={f} evidencePackage={pkgByFinding[f.finding_id]} />
              ))}
            </div>
          </section>

          <EvidenceTimeline investigation={inv} />
          <TransactionCluster investigation={inv} onSelect={setSelectedTx} />
          {pkgByFinding[(inv.finding_ids ?? [])[0]] && (
            <BehavioralBaseline evidencePackage={pkgByFinding[(inv.finding_ids ?? [])[0]]} />
          )}

          <section aria-label="AI analysis">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/25 text-violet-300">AI ANALYSIS</span>
              <h3 className="text-white font-semibold text-[15px]">Investigation Explanation</h3>
            </div>
            {/* compact card — full summary opens in popup */}
            <div className="rounded-xl bg-ink-800 border border-white/[0.06] p-6 flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 inline-flex items-center justify-center text-violet-300">
                <Bot size={20} />
              </div>
              <p className="mt-3 text-white font-semibold text-[14px]">AI Investigation Summary</p>
              <p className="mt-1 text-[13px] text-slate-500 max-w-md">Executive summary, what happened, why flagged, and evidence-grounded rule explanations.</p>
              <button
                type="button"
                onClick={() => setShowAiPopup(true)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-[13px] font-semibold transition-colors"
              >
                <Eye size={15} /> View Summary
              </button>
              <p className="mt-2 text-[11px] text-slate-600">AI explains the deterministic evidence — it does not decide the risk.</p>
            </div>
          </section>

          {/* AI summary popup */}
          {showAiPopup && (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label="AI investigation summary">
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAiPopup(false)} />
              <div className="relative w-full max-w-3xl my-8 max-h-[88vh] flex flex-col rounded-2xl bg-ink-850 border border-white/10 shadow-2xl overflow-hidden">
                <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-violet-300" />
                    <h3 className="text-white font-semibold text-[14px]">AI Investigation Summary</h3>
                    <span className="hidden sm:inline text-[11px] font-mono px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300">AI explains · rules decide</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiPopup(false)}
                    aria-label="Close summary"
                    className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-5">
                  <AiAnalysisPanel
                    investigationId={investigationId}
                    showInput={false}
                    autoLoad
                    refreshSignal={regenKey}
                    onAnalysis={handleAnalysis}
                    onSettled={handleSettled}
                  />
                </div>
              </div>
            </div>
          )}

          <TraceabilityChain investigation={inv} analysis={analysis} />
        </div>
      )}
      <TransactionDetailModal transactionId={selectedTx} onClose={() => setSelectedTx(null)} />
    </PageContainer>
  )
}
