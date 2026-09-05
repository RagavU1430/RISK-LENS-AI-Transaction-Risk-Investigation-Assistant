import { CircleDot, Gavel, FilePlus2, Clock, ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatAmount, formatDateTime } from '../../lib/format.js'

function toTxLink(tid) {
  return `/transactions?search=${encodeURIComponent(tid)}`
}

export default function EvidenceTimeline({ investigation }) {
  const events = []
  for (const pkg of investigation.evidence_packages ?? []) {
    for (const t of pkg.primary_transactions ?? []) {
      events.push({ ts: t.timestamp, kind: 'tx', tx: t, label: `Transaction ${t.transaction_id}` })
    }
  }
  for (const f of investigation.findings ?? []) {
    events.push({ ts: f.detected_at, kind: 'rule', finding: f, label: `Rule ${f.rule_id} Triggered` })
  }
  const created = [...events].map((e) => e.ts).filter(Boolean).sort()
  if (created.length) {
    events.push({ ts: created[created.length - 1], kind: 'created', label: 'Investigation Created' })
  }
  events.sort((a, b) => String(a.ts ?? '').localeCompare(String(b.ts ?? '')))

  if (!events.length) return null
  return (
    <section aria-label="Evidence timeline" className="relative rounded-2xl border border-white/[0.06] p-6 overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.02] via-transparent to-violet-500/[0.02] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-300"><Clock size={14} /></span>
          <div>
            <h3 className="text-white font-bold text-[15px] tracking-tight">Evidence Timeline</h3>
            <p className="text-xs text-slate-500">Causality chain — what happened, in order</p>
          </div>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/5 text-slate-500"><Clock size={11} /> {events.length} events</span>
        </div>
        <ol className="relative ml-3 border-l border-white/10 space-y-0">
          {/* animated line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-sky-400/60 via-violet-400/30 to-emerald-400/40" style={{ boxShadow: '0 0 8px rgba(56,189,248,0.3)' }} />
          {events.map((e, i) => (
            <li key={i} className="relative ml-7 pb-6 last:pb-0 group">
              <span className={`absolute -left-[35px] top-1 w-7 h-7 rounded-xl border flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 ${e.kind === 'tx' ? 'bg-sky-500/15 border-sky-500/25 text-sky-300 shadow-sky-500/10' : e.kind === 'rule' ? 'bg-amber-500/15 border-amber-500/25 text-amber-300 shadow-amber-500/10' : 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300'}`}>
                {e.kind === 'tx' ? <CircleDot size={13} /> : e.kind === 'rule' ? <Gavel size={13} /> : <FilePlus2 size={13} />}
                <span className={`absolute inset-0 rounded-xl ${e.kind === 'tx' ? 'bg-sky-400' : e.kind === 'rule' ? 'bg-amber-400' : 'bg-emerald-400'} opacity-0 group-hover:opacity-10 transition-opacity blur-sm`} />
              </span>
              {/* card */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-3.5 group-hover:bg-white/[0.04] group-hover:border-white/10 group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                <p className="text-xs font-mono font-medium text-slate-500 flex items-center gap-1.5"><Clock size={11} className="text-slate-600" />{formatDateTime(e.ts)}</p>
                {e.kind === 'tx' ? (
                  <p className="mt-1.5 text-[13px] text-slate-200 flex flex-wrap items-center gap-2">
                    <Link to={toTxLink(e.tx.transaction_id)} className="font-mono font-bold text-sky-300 hover:text-sky-200 bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded-lg hover:bg-sky-500/15 transition-colors">{e.tx.transaction_id}</Link>
                    <span className="text-slate-400 font-medium">{formatAmount(e.tx.amount)}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-300">{e.tx.payee}</span>
                    <span className="ml-auto hidden sm:inline-flex text-[11px] font-mono px-2 py-1 rounded-full bg-white/[0.04] border border-white/5 text-slate-500">{e.tx.channel}</span>
                  </p>
                ) : e.kind === 'rule' ? (
                  <p className="mt-1.5 text-[13px] text-slate-200 flex flex-wrap items-center gap-2">
                    <span className="font-mono font-extrabold px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/20 text-amber-300 text-xs">{e.finding.rule_id}</span>
                    <span className="text-slate-300 font-medium">triggered</span>
                    <span className="font-mono text-xs text-slate-500 bg-white/[0.04] border border-white/5 px-2 py-1 rounded-lg">{(e.finding.transaction_ids ?? []).join(', ')}</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-[13px] font-medium text-emerald-300 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" />{e.label}</p>
                )}
              </div>
              {i < events.length - 1 && <div className="absolute left-[-18px] top-[34px] bottom-0 w-px bg-gradient-to-b from-white/20 to-transparent opacity-40 group-last:hidden" />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
