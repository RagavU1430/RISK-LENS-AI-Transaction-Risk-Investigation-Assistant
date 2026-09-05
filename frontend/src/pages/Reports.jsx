import { useEffect, useState } from 'react'
import { Printer, X, FileText, Sparkles, Shield, Layers, Wallet, Eye } from 'lucide-react'
import PageContainer from '../components/PageContainer.jsx'
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx'
import ErrorState from '../components/common/ErrorState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SeverityBadge from '../components/common/SeverityBadge.jsx'
import { getInvestigation, getInvestigationAnalysis, getInvestigations } from '../lib/api.js'
import { formatAmount, formatDateTime } from '../lib/format.js'

const inputCls = 'px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] font-mono text-slate-200 focus:outline-none focus:bg-white/[0.06] focus:border-sky-500/30 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] transition-all duration-200'

export default function Reports() {
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState('INV-F0001')
  const [inv, setInv] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [state, setState] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    getInvestigations({ limit: 1000 })
      .then((d) => setOptions((d.investigations ?? []).slice(0, 100)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setState('loading')
    Promise.all([getInvestigation(selected), getInvestigationAnalysis(selected).catch(() => null)])
      .then(([detail, ai]) => {
        setInv(detail)
        setAnalysis(ai)
        setState('done')
        setShowPopup(true)
      })
      .catch(() => setState('error'))
  }, [selected, attempt])

  useEffect(() => {
    if (!showPopup) return
    const onKey = (e) => { if (e.key === 'Escape') setShowPopup(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPopup])

  useEffect(() => {
    document.body.style.overflow = showPopup ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showPopup])

  return (
    <PageContainer
      eyebrow="Output"
      title="Reports"
      description="Analyst-ready investigation report — deterministic findings plus grounded AI explanation, printable and traceable."
    >
      <div className="rounded-2xl border border-white/[0.06] p-4 mb-6 flex flex-wrap items-center gap-3 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', backdropFilter: 'blur(12px)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.02] via-transparent to-violet-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <label htmlFor="report-inv" className="relative text-xs font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1.5"><FileText size={12} className="text-sky-400" /> Investigation</label>
        <select id="report-inv" value={selected} onChange={(e) => { setSelected(e.target.value); setShowPopup(false) }} className={`${inputCls} min-w-[160px] relative`}>
          {options.map((o) => <option key={o.investigation_id} value={o.investigation_id}>{o.investigation_id}</option>)}
        </select>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5 text-slate-500">
          <Sparkles size={11} className="text-violet-400" /> AI + evidence
        </span>
        <button
          type="button"
          disabled={state !== 'done' || !inv}
          onClick={() => setShowPopup(true)}
          className="relative ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white text-[13px] font-bold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all duration-200"
        >
          <Eye size={15} /> View Report
        </button>
      </div>

      {state === 'loading' && <LoadingSkeleton rows={6} />}
      {state === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
      {state === 'done' && !inv && (
        <EmptyState icon={FileText} title="No reports generated." description="Select an investigation to preview its report." />
      )}
      {state === 'done' && inv && !showPopup && (
        <div className="rounded-2xl border border-white/[0.06] p-8 flex flex-col items-center text-center relative overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.02] via-transparent to-violet-500/[0.02] pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-300 shadow shadow-sky-500/10">
            <FileText size={24} />
          </div>
          <p className="mt-4 text-white font-bold text-[16px] tracking-tight">Report ready: {inv.investigation_id}</p>
          <p className="mt-1.5 text-[13px] text-slate-500 max-w-md">Deterministic findings, evidence, baseline, and AI summary — ready to view, print, or share.</p>
          <button
            type="button"
            onClick={() => setShowPopup(true)}
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[13px] font-bold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all duration-200"
          >
            <FileText size={15} /> Open Report
          </button>
          <p className="mt-3 text-xs text-slate-600">Traceable · printable · evidence-grounded</p>
        </div>
      )}

      {showPopup && inv && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label="Investigation report">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPopup(false)} />
          <div className="relative w-full max-w-3xl my-8 max-h-[88vh] flex flex-col rounded-2xl bg-ink-850 border border-white/10 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
            <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-300"><FileText size={16} /></span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-500">Investigation Report</p>
                  <h3 className="font-mono text-white font-bold">{inv.investigation_id} <span className="font-sans text-slate-500 font-normal">· {inv.customer_id}</span></h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[13px] font-bold shadow-lg shadow-sky-500/20 transition-colors"
                >
                  <Printer size={15} /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  aria-label="Close report"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-6 sm:px-8 py-6 space-y-6">
              <ReportSection title="Risk Findings" icon={Shield}>
                <ul className="space-y-2">
                  {(inv.findings ?? []).map((f) => (
                    <li key={f.finding_id} className="flex flex-wrap items-center gap-2 text-[13px] p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <SeverityBadge severity={f.severity} />
                      <span className="font-mono font-bold text-slate-200">{f.rule_id}</span>
                      <span className="text-slate-400">{f.rule_name}</span>
                      <span className="font-mono text-xs text-slate-500 bg-ink-900/50 border border-white/5 px-2 py-1 rounded-lg">{(f.transaction_ids ?? []).join(', ')}</span>
                    </li>
                  ))}
                </ul>
              </ReportSection>
              <ReportSection title="Key Transactions" icon={Wallet}>
                <ul className="text-[13px] space-y-1.5">
                  {(inv.evidence_packages ?? []).flatMap((p) => p.primary_transactions ?? []).slice(0, 12).map((t) => (
                    <li key={t.transaction_id} className="font-mono text-xs flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                      <span className="text-sky-300 font-bold">{t.transaction_id}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{formatDateTime(t.timestamp)}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300">{t.payee}</span>
                      <span className="ml-auto text-amber-300 font-bold">{formatAmount(t.amount)}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-500">{t.channel}</span>
                    </li>
                  ))}
                </ul>
              </ReportSection>
              <ReportSection title="Behavioral Analysis" icon={Layers}>
                <p className="text-[13px] text-slate-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5">
                  {(inv.evidence_packages ?? []).map((p) => {
                    const c = p.baseline_comparison ?? {}
                    return `${p.rule_id}: observed ${c.observed ?? '—'} vs baseline ${c.baseline ?? c.baseline_mean ?? '—'}.`
                  }).join(' ')}
                </p>
              </ReportSection>
              <ReportSection title="AI Investigation Summary" icon={Sparkles}>
                {analysis?.status === 'complete' ? (
                  <div className="text-[13px] leading-relaxed space-y-3">
                    <p className="text-slate-200 bg-violet-500/[0.04] border border-violet-500/10 rounded-xl p-3.5">{analysis.executive_summary}</p>
                    <p className="text-slate-400 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5">{analysis.uncertainty}</p>
                  </div>
                ) : (
                  <p className="text-[13px] text-slate-500 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5">AI analysis unavailable. Deterministic investigation evidence remains available.</p>
                )}
              </ReportSection>
              <ReportSection title="Analyst Considerations" icon={Eye}>
                <ul className="space-y-2">
                  {(analysis?.status === 'complete' ? analysis.analyst_considerations ?? [] : ['Review primary transactions against known customer obligations.']).map((a, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-300">{a}</span>
                    </li>
                  ))}
                </ul>
              </ReportSection>
              <ReportSection title="Source Traceability" icon={Layers}>
                <p className="font-mono text-xs text-slate-500 bg-ink-900/40 border border-white/5 rounded-xl px-3 py-2.5 inline-flex flex-wrap gap-x-3 gap-y-1">
                  <span>data/transactions.csv</span><span className="text-slate-700">·</span><span>data/findings.json</span><span className="text-slate-700">·</span><span>data/evidence.json</span>
                </p>
              </ReportSection>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

function ReportSection({ title, icon: Icon, children }) {
  return (
    <section>
      <h4 className="text-white font-bold text-[14px] mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center text-slate-400"><Icon size={13} /></span>
        {title}
      </h4>
      {children}
    </section>
  )
}
