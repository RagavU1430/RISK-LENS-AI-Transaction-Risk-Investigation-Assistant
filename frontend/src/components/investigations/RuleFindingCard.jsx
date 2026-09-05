import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Zap, ShieldAlert, Hash, Calculator, Eye, X, ExternalLink } from 'lucide-react'
import SeverityBadge from '../common/SeverityBadge.jsx'
import DangerText from '../common/DangerHighlight.jsx'
import { cx, formatAmount, formatDateTime } from '../../lib/format.js'

function Row({ label, value, mono = false, danger = false, icon: Icon }) {
  const content = danger && value != null ? <DangerText>{String(value)}</DangerText> : (value ?? '—')
  return (
    <div className="group/row flex items-baseline justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors">
      <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 shrink-0">
        {Icon && <Icon size={11} className="text-slate-600" />}
        {label}
      </span>
      <span className={cx('text-[13px] text-slate-200 text-right font-medium', mono && 'font-mono')}>{content}</span>
    </div>
  )
}

// Premium rule card — progressive disclosure, depth, and evidence-first layout.
// No frontend recalculation of rules.
export default function RuleFindingCard({ finding, evidencePackage }) {
  const [open, setOpen] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const ev = finding.evidence ?? {}
  const calc = finding.calculation ?? {}
  const pkg = evidencePackage ?? {}
  const comparison = pkg.baseline_comparison ?? {}
  const isHigh = finding.severity === 'HIGH'

  useEffect(() => {
    if (!popupOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setPopupOpen(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [popupOpen])

  const detailContent = (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
        <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 flex items-center gap-1.5 mb-2"><Eye size={11} className="text-sky-400" /> Why triggered</p>
        <p className="text-[13px] text-slate-300 leading-relaxed"><DangerText>{finding.summary}</DangerText></p>
        <div className="mt-4 space-y-0.5">
          <Row label="Transactions" value={(finding.transaction_ids ?? []).join(', ')} mono icon={Hash} />
          <Row label="Formula" value={calc.formula} mono icon={Calculator} />
          <Row label="Result" value={calc.result !== undefined ? String(calc.result) : undefined} mono danger icon={Calculator} />
          <Row label="Threshold" value={calc.threshold !== undefined ? String(calc.threshold) : undefined} mono icon={ShieldAlert} />
        </div>
      </div>
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
        <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 flex items-center gap-1.5 mb-2"><Zap size={11} className="text-amber-400" /> Evidence</p>
        <div className="space-y-0.5">
          <Row label="Observed" value={comparison.observed ?? ev.amount} mono danger />
          <Row label="Baseline" value={comparison.baseline ?? comparison.baseline_mean ?? ev.customer_median} mono />
          {comparison.ratio !== undefined && <Row label="Ratio" value={`${comparison.ratio}×`} mono danger />}
          {comparison.difference !== undefined && <Row label="Difference" value={formatAmount(comparison.difference)} mono danger />}
          {comparison.deviation !== undefined && <Row label="Deviation" value={String(comparison.deviation)} mono />}
          {ev.payee && <Row label="Payee" value={ev.payee} />}
          {ev.timestamp && <Row label="Timestamp" value={formatDateTime(ev.timestamp)} mono />}
          {ev.hour !== undefined && <Row label="Hour" value={`${String(ev.hour).padStart(2, '0')}:00`} mono />}
          {comparison.window_minutes !== undefined && <Row label="Window" value={`${comparison.window_minutes} min`} mono />}
        </div>
        <p className="mt-3 text-[11px] font-mono text-slate-600 bg-ink-900/50 border border-white/5 rounded-lg px-2.5 py-2">Exact backend values · no frontend math</p>
      </div>
    </div>
  )

  return (
    <article className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${open ? 'border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]' : 'border-white/[0.04] hover:border-white/10'} ${isHigh ? 'hover:shadow-[0_8px_32px_rgba(251,113,133,0.08)]' : 'hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)]'}`} style={{ background: open ? 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))' : 'rgba(255,255,255,0.015)', backdropFilter: 'blur(8px)' }}>
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${isHigh ? 'via-rose-500/20' : 'via-amber-500/15'} to-transparent opacity-60`} />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative w-full flex items-center gap-3.5 px-5 py-4 text-left"
      >
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border transition-transform duration-300 group-hover:scale-105 ${isHigh ? 'bg-rose-500/15 border-rose-500/20 text-rose-300 shadow-rose-500/10' : 'bg-amber-500/12 border-amber-500/20 text-amber-300'}`}>
          <Zap size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-extrabold tracking-tight text-white">{finding.rule_id}</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 text-slate-400">{finding.rule_name}</span>
            <SeverityBadge severity={finding.severity} />
          </span>
          <span className="block text-[12.5px] text-slate-500 mt-1 flex items-center gap-1.5"><ShieldAlert size={11} className="text-slate-600" /> Triggered · {formatDateTime(finding.detected_at)}</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/5 text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-sky-500/10 hover:border-sky-500/20 hover:text-sky-300 transition-colors mr-1" onClick={(e) => { e.stopPropagation(); setPopupOpen(true) }}>
          <Eye size={12} /> View
        </span>
        <span className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-200 ${open ? 'bg-white/[0.06] border-white/10 text-slate-300 rotate-180' : 'bg-white/[0.02] border-white/5 text-slate-600 group-hover:bg-white/[0.06] group-hover:text-slate-400'}`}>
          <ChevronDown size={16} />
        </span>
      </button>

      {open && (
        <div className="relative px-5 pb-5 animate-[slideUp_0.25s_ease-out]">
          <div className="h-px bg-white/[0.04] mb-4" />
          {detailContent}
          <button type="button" onClick={() => setPopupOpen(true)} className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 text-sky-300 text-[13px] font-semibold transition-colors">
            <Eye size={14} /> Open in popup
          </button>
        </div>
      )}

      {popupOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label={`${finding.rule_id} detail`}>
          <div className="fixed inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={() => setPopupOpen(false)} />
          <div className="relative w-full max-w-2xl my-8 max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-ink-800 shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)' }}>
            <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl border flex items-center justify-center ${isHigh ? 'bg-rose-500/15 border-rose-500/20 text-rose-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}><Zap size={16} /></span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">{finding.rule_id} · Rule Detail</p>
                  <h3 className="text-white font-bold text-[14px]">{finding.rule_name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={finding.severity} />
                <button type="button" onClick={() => setPopupOpen(false)} aria-label="Close" className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]"><X size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-6">
              {detailContent}
              <a href={`/investigations/${finding.transaction_ids?.[0] ? '' : ''}`} onClick={(e) => { e.preventDefault(); setPopupOpen(false) }} className="mt-4 hidden" />
              <p className="mt-4 text-center text-[11px] font-mono text-slate-600 flex items-center justify-center gap-1.5"><ExternalLink size={11} /> Trace via transaction {finding.transaction_ids?.[0] ?? ''}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </article>
  )
}
