import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Loader2, RotateCcw, Search, Sparkles, Shield, Layers, Brain, AlertTriangle, CheckCircle2, Database, Eye } from 'lucide-react'
import { getInvestigationAnalysis, regenerateInvestigationAnalysis } from '../lib/api.js'
import DangerText from './common/DangerHighlight.jsx'

const STATUS_COPY = {
  unavailable: 'AI analysis unavailable. Deterministic investigation evidence remains available.',
  error: 'Unable to generate AI analysis.',
  grounding_failed: 'AI response failed evidence validation.',
}

function Section({ title, icon: Icon, accent = 'slate', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const tones = {
    violet: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
    sky: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    slate: 'text-slate-400 bg-white/[0.04] border-white/5',
  }
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)', backdropFilter: 'blur(4px)' }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${tones[accent]}`}>
          <Icon size={13} />
        </span>
        <span className="text-[12px] font-bold tracking-wide text-white flex-1 text-left">{title}</span>
        <span className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs transition-transform ${open ? 'bg-white/[0.06] border-white/10 text-slate-300 rotate-180' : 'bg-white/[0.02] border-white/5 text-slate-600'}`}>⌄</span>
      </button>
      {open && <div className="px-4 pb-4 pt-0 text-[13px] leading-relaxed text-slate-300 border-t border-white/[0.04] mt-0">{children}</div>}
    </div>
  )
}

function ThinkingAnimation() {
  const steps = [
    { label: 'Evidence', icon: Layers, done: true },
    { label: 'Context', icon: Database, done: true },
    { label: 'AI Analysis', icon: Brain, active: true },
  ]
  return (
    <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.03] via-transparent to-violet-500/[0.02] animate-pulse-subtle" />
      <div className="relative flex items-center justify-center gap-2 sm:gap-3">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 sm:gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${s.active ? 'bg-violet-500/15 border-violet-500/25 text-violet-200 shadow shadow-violet-500/10 scale-105' : s.done ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-300' : 'bg-white/[0.03] border-white/5 text-slate-500'}`}>
              <s.icon size={13} className={s.active ? 'animate-pulse-subtle' : ''} />
              <span className="hidden sm:inline">{s.label}</span>
              {s.done && <CheckCircle2 size={12} className="text-emerald-400" />}
              {s.active && <Loader2 size={12} className="animate-spin" />}
            </div>
            {i < steps.length - 1 && <span className={`w-6 h-px hidden sm:block ${s.done ? 'bg-emerald-400/50' : 'bg-white/10'}`} style={{ boxShadow: s.done ? '0 0 8px rgba(52,211,153,0.3)' : undefined }} />}
          </div>
        ))}
      </div>
      <div className="relative mt-3 flex items-center justify-center gap-2 text-xs text-violet-300">
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse-subtle" />
        Generating grounded explanation — rules stay deterministic
        <span className="inline-flex gap-1 ml-1">
          <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  )
}

export default function AiAnalysisPanel({ investigationId: fixedId, showInput = true, autoLoad = false, refreshSignal, onAnalysis, onSettled }) {
  const [inputId, setInputId] = useState(fixedId ?? 'INV-F0001')
  const [state, setState] = useState('idle')
  const [report, setReport] = useState(null)
  const [message, setMessage] = useState('')

  const onAnalysisRef = useRef(onAnalysis)
  const onSettledRef = useRef(onSettled)
  onAnalysisRef.current = onAnalysis
  onSettledRef.current = onSettled
  const inFlight = useRef(false)
  const autoLoadedId = useRef(null)

  const load = useCallback(async (regenerate = false) => {
    const id = (fixedId ?? inputId).trim()
    if (!id || inFlight.current) return
    inFlight.current = true
    setState('loading')
    setMessage('')
    try {
      const data = regenerate
        ? await regenerateInvestigationAnalysis(id)
        : await getInvestigationAnalysis(id)
      setReport(data)
      setState('done')
      onAnalysisRef.current?.(data)
    } catch (err) {
      setMessage(err.message)
      setState('error')
    } finally {
      inFlight.current = false
      onSettledRef.current?.()
    }
  }, [fixedId, inputId])

  useEffect(() => {
    if (autoLoad && fixedId && autoLoadedId.current !== fixedId) {
      autoLoadedId.current = fixedId
      load(false)
    }
  }, [autoLoad, fixedId, load])

  const prevSignal = useRef(refreshSignal)
  useEffect(() => {
    if (prevSignal.current !== refreshSignal) {
      prevSignal.current = refreshSignal
      load(true)
    }
  }, [refreshSignal, load])

  const status = report?.status

  return (
    <div className="relative rounded-2xl border border-violet-500/15 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(17,26,46,0.9) 50%, rgba(13,20,36,0.95) 100%)', boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] via-transparent to-sky-500/[0.03] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)' }} />

      <div className="relative p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-300 shadow shadow-violet-500/10">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="text-white font-bold text-[14px] tracking-tight flex items-center gap-2">
                AI Investigation Analysis
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/15 border border-violet-500/20 text-[10px] font-bold tracking-widest uppercase text-violet-300"><Sparkles size={10} /> Gemini</span>
              </h3>
              <p className="text-xs text-violet-300/70 font-medium">Evidence-grounded · rules decide, AI explains</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {showInput && (
              <input
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                placeholder="INV-F0001"
                spellCheck={false}
                aria-label="Investigation ID"
                className="w-28 sm:w-36 px-3 py-2 rounded-xl bg-ink-900/80 border border-white/[0.08] text-[13px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/30 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all"
              />
            )}
            <button
              type="button"
              onClick={() => load(false)}
              disabled={state === 'loading'}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white text-[13px] font-bold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              {state === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              <span className="hidden sm:inline">Analyze</span>
            </button>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={state === 'loading'}
              title="Regenerate from the same deterministic context"
              className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-60 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all hover:rotate-180 duration-300"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 flex items-start gap-2.5">
          <Shield size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed text-amber-200/80">
            <span className="font-bold text-amber-300">Deterministic first:</span> Rule Triggered = evidence from R01–R05. <span className="text-violet-300 font-medium">AI Summary</span> is a grounded explanation only — it never decides risk.
          </p>
        </div>
        <p className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5"><Eye size={11} /> AI-generated explanation grounded in deterministic investigation evidence. AI does not determine the risk finding.</p>

        {state === 'loading' && (
          <div className="mt-5">
            <ThinkingAnimation />
          </div>
        )}
        {state === 'error' && (
          <div className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0" />
            <p className="text-[13px] font-medium text-rose-300">{message || 'Unable to generate AI analysis.'}</p>
          </div>
        )}
        {state === 'done' && report && (status === 'complete' ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.04] to-transparent pointer-events-none" />
              <p className="relative text-[11px] uppercase tracking-[0.14em] font-bold text-violet-300 flex items-center gap-1.5"><Sparkles size={11} /> Executive Summary</p>
              <p className="relative mt-2 text-[13.5px] leading-relaxed text-slate-200"><DangerText>{report.executive_summary}</DangerText></p>
            </div>
            <Section title="What Happened" icon={Eye} accent="sky"><DangerText>{report.what_happened}</DangerText></Section>
            <Section title="Why Flagged" icon={AlertTriangle} accent="amber"><DangerText>{report.why_flagged}</DangerText></Section>
            <Section title="Behavioral Comparison" icon={Layers} accent="emerald"><DangerText>{report.behavioral_comparison}</DangerText></Section>
            <Section title={`Rule Explanations (${report.rule_explanations?.length ?? 0})`} icon={Shield} accent="sky">
              <ul className="space-y-2.5">
                {(report.rule_explanations ?? []).map((r) => (
                  <li key={r.rule_id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 hover:bg-white/[0.04] hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sky-300 text-xs font-bold px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20">{r.rule_id}</span>
                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-slate-500 text-xs font-mono truncate">{(r.transaction_ids ?? []).join(', ')}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-300"><DangerText>{r.explanation}</DangerText></p>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title={`Key Evidence (${report.key_evidence?.length ?? 0})`} icon={Database} accent="amber">
              <ul className="space-y-2.5">
                {(report.key_evidence ?? []).map((e, i) => (
                  <li key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <p className="text-slate-200 font-semibold text-[13px]"><DangerText>{e.title}</DangerText></p>
                    <p className="mt-1 text-slate-400 text-[13px] leading-relaxed"><DangerText>{e.observation}</DangerText></p>
                    {e.supporting_transaction_ids?.length > 0 && <p className="mt-2 font-mono text-[11px] text-slate-600 bg-ink-900/50 border border-white/5 rounded-lg px-2.5 py-1.5 inline-block">{e.supporting_transaction_ids.join(', ')}</p>}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Analyst Considerations" icon={Eye} accent="emerald">
              <ul className="space-y-2">
                {(report.analyst_considerations ?? []).map((a, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-slate-300"><DangerText>{a}</DangerText></span>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Uncertainty" icon={AlertTriangle} accent="slate"><DangerText>{report.uncertainty}</DangerText></Section>
            <Section title={`Source References (${report.source_references?.length ?? 0})`} icon={Layers} accent="slate">
              <ul className="flex flex-wrap gap-1.5">
                {(report.source_references ?? []).map((s, i) => (
                  <li key={i} title={s.description} className="group inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:bg-sky-500/10 hover:border-sky-500/20 hover:text-sky-300 transition-colors cursor-pointer">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.source_type === 'transaction' ? 'bg-sky-400' : s.source_type === 'finding' ? 'bg-amber-400' : 'bg-violet-400'}`} />
                    {s.source_type}:{s.source_id}
                  </li>
                ))}
              </ul>
            </Section>
            {report.cached && <p className="font-mono text-[11px] text-slate-600 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 inline-flex items-center gap-1.5"><CheckCircle2 size={11} /> served from cache · deterministic context unchanged</p>}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[13px] font-medium text-amber-200">{STATUS_COPY[status] ?? STATUS_COPY.error}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
