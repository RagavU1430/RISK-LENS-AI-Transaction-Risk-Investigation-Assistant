import { Link } from 'react-router-dom'
import { MoveDown, Database, FileSearch, Layers, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react'

function Node({ title, sub, to, mono = false, icon: Icon, accent = 'slate', clickable = false }) {
  const tones = {
    sky: 'border-sky-500/20 bg-sky-500/[0.06] hover:border-sky-500/30 hover:bg-sky-500/[0.08]',
    violet: 'border-violet-500/20 bg-violet-500/[0.06] hover:border-violet-500/30',
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.06]',
    amber: 'border-amber-500/20 bg-amber-500/[0.06]',
    slate: 'border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]',
  }
  const iconTones = {
    sky: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    slate: 'bg-white/[0.04] text-slate-400 border-white/5',
  }
  const inner = (
    <>
      <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${iconTones[accent]}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">{title}</p>
        <p className={`mt-1 text-[13px] font-medium text-slate-200 truncate ${mono ? 'font-mono' : ''}`}>{sub}</p>
      </div>
      {clickable && <ExternalLink size={12} className="text-slate-600 shrink-0" />}
    </>
  )
  const cls = `flex items-center gap-3 rounded-xl border px-4 py-3.5 backdrop-blur transition-all duration-200 ${tones[accent]} ${clickable ? 'hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 cursor-pointer' : ''}`
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>
}

export default function TraceabilityChain({ investigation, analysis }) {
  const findings = investigation.findings ?? []
  const txIds = [...new Set(findings.flatMap((f) => f.transaction_ids ?? []))]
  const firstTx = txIds[0]
  const firstFinding = findings[0]
  return (
    <section aria-label="Source traceability" className="rounded-2xl border border-white/[0.06] p-6 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-sky-500/[0.02] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300"><ShieldCheck size={14} /></span>
          <div>
            <h3 className="text-white font-bold text-[15px] tracking-tight">Source Traceability</h3>
            <p className="text-xs text-slate-500">Click any node to trace the evidence chain</p>
          </div>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" /> Verifiable</span>
        </div>
        <div className="max-w-xl space-y-0">
          <Node title="Transaction" sub={`${txIds.length} record${txIds.length === 1 ? '' : 's'} · ${firstTx ?? '—'}`} to={firstTx ? `/transactions?search=${encodeURIComponent(firstTx)}` : undefined} mono icon={Database} accent="sky" clickable={!!firstTx} />
          <Arrow label="deterministic" />
          <Node title="Finding" sub={`${findings.length} finding${findings.length === 1 ? '' : 's'} · ${findings.map((f) => f.finding_id).join(', ')}`} mono icon={FileSearch} accent="amber" />
          <Arrow label="enrichment" />
          <Node title="Evidence" sub={`${(investigation.evidence_packages ?? []).length} package${(investigation.evidence_packages ?? []).length === 1 ? '' : 's'} · data/evidence.json`} to="/evidence" icon={Layers} accent="slate" clickable />
          <Arrow label="context" />
          <Node title="Investigation" sub={investigation.investigation_id} mono icon={FileSearch} accent="slate" />
          <Arrow label="explanation" />
          <Node
            title="AI Explanation"
            sub={analysis?.status === 'complete' ? `Grounded in ${analysis.source_references?.length ?? 0} refs · tap to verify` : 'Not generated — deterministic evidence remains authoritative'}
            icon={Sparkles} accent={analysis?.status === 'complete' ? 'violet' : 'slate'}
          />
        </div>
        {firstFinding && (
          <p className="mt-4 text-xs font-mono text-slate-600 bg-ink-900/40 border border-white/5 rounded-lg px-3 py-2 inline-flex flex-wrap gap-x-3 gap-y-1">
            <span>source: data/transactions.csv</span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span>data/findings.json</span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span>data/evidence.json</span>
          </p>
        )}
      </div>
    </section>
  )
}

function Arrow({ label }) {
  return (
    <div className="pl-[17px] py-1 flex items-center gap-2 text-slate-700" aria-hidden>
      <div className="w-px h-5 bg-gradient-to-b from-white/20 to-transparent" />
      <MoveDown size={12} className="text-slate-600" />
      {label && <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">{label}</span>}
    </div>
  )
}
