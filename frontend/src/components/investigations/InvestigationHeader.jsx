import { ShieldAlert, Clock, User, Zap, RotateCcw, Sparkles } from 'lucide-react'
import SeverityBadge from '../common/SeverityBadge.jsx'
import { formatDateTime, statusForSeverity } from '../../lib/format.js'

export default function InvestigationHeader({ investigation, onRegenerate, regenerating }) {
  const rules = [...new Set((investigation.findings ?? []).map((f) => f.rule_id))]
  const sev = maxSev(investigation)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]" style={{ background: 'linear-gradient(135deg, rgba(17,26,46,0.9) 0%, rgba(13,20,36,0.95) 100%)', boxShadow: '0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle, ${sev === 'HIGH' ? 'rgba(251,113,133,0.35)' : sev === 'MEDIUM' ? 'rgba(251,191,36,0.3)' : 'rgba(56,189,248,0.3)'}, transparent 70%)` }} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 grid-pattern opacity-[0.02] pointer-events-none" />

      <div className="relative p-6 sm:p-7">
        <div className="flex flex-wrap items-start gap-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden ${sev === 'HIGH' ? 'bg-rose-500/15 border border-rose-500/25 text-rose-300' : sev === 'MEDIUM' ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300' : 'bg-sky-500/15 border border-sky-500/25 text-sky-300'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <ShieldAlert size={22} className="relative" />
            <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-ink-800 ${sev === 'HIGH' ? 'bg-rose-400' : sev === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse-subtle`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500">Investigation</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase border ${sev === 'HIGH' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : sev === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-sky-500/10 border-sky-500/20 text-sky-300'}`}>{sev} · {statusForSeverity(sev)}</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] border border-white/5 text-[11px] font-mono text-slate-500"><Zap size={10} className="text-sky-400" /> {rules.join(' + ') || '—'}</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-[26px] font-extrabold tracking-tight text-white font-mono leading-none">{investigation.investigation_id}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
              <span className="inline-flex items-center gap-2 text-slate-400"><User size={13} className="text-slate-600" /> Customer <span className="font-mono font-semibold text-slate-200 bg-white/[0.04] border border-white/5 px-2 py-1 rounded-lg">{investigation.customer_id}</span></span>
              <span className="inline-flex items-center gap-2 text-slate-400"><Clock size={13} className="text-slate-600" /> Detected <span className="font-medium text-slate-200">{formatDateTime((investigation.findings ?? [])[0]?.detected_at)}</span></span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <SeverityBadge severity={sev} />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" /> Deterministic</span>
          </div>
        </div>

        {onRegenerate && (
          <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 disabled:opacity-60 border border-violet-500/25 text-violet-200 text-[13px] font-semibold backdrop-blur transition-all duration-200 hover:shadow hover:shadow-violet-500/10 hover:-translate-y-0.5"
            >
              <RotateCcw size={14} className={regenerating ? 'animate-spin' : ''} /> {regenerating ? 'Generating…' : 'Regenerate AI Analysis'}
            </button>
            <span className="text-xs text-slate-500 inline-flex items-center gap-1.5"><Sparkles size={12} className="text-violet-400" /> AI explains only — risk is deterministic</span>
          </div>
        )}
      </div>
    </div>
  )
}

function maxSev(inv) {
  const order = { HIGH: 3, MEDIUM: 2, LOW: 1 }
  let best = 'LOW'
  for (const f of inv.findings ?? []) {
    if ((order[f.severity] ?? 0) >= (order[best] ?? 0)) best = f.severity
  }
  return best
}
