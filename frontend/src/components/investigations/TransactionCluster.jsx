import { Wallet, Clock, CreditCard, Tag, ShieldAlert, Crown } from 'lucide-react'
import { formatAmount, formatDateTime } from '../../lib/format.js'

export default function TransactionCluster({ investigation, onSelect }) {
  const rows = []
  const seen = new Set()
  const ruleByTx = {}
  for (const f of investigation.findings ?? []) {
    for (const tid of f.transaction_ids ?? []) {
      ;(ruleByTx[tid] ??= []).push(f.rule_id)
    }
  }
  for (const pkg of investigation.evidence_packages ?? []) {
    for (const t of [...(pkg.primary_transactions ?? []), ...(pkg.related_transactions ?? [])]) {
      if (!t?.transaction_id || seen.has(t.transaction_id)) continue
      seen.add(t.transaction_id)
      rows.push({ ...t, primary: (pkg.primary_transactions ?? []).some((p) => p.transaction_id === t.transaction_id) })
    }
  }
  rows.sort((a, b) => String(a.timestamp ?? '').localeCompare(String(b.timestamp ?? '')))
  if (!rows.length) return null

  const primaries = rows.filter((r) => r.primary).length

  return (
    <section aria-label="Transaction cluster" className="rounded-2xl border border-white/[0.06] overflow-hidden relative group" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.02] via-transparent to-violet-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative p-5 pb-3 flex flex-wrap items-center gap-3">
        <h3 className="text-white font-bold text-[15px] tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-300"><Wallet size={14} /></span>
          Transaction Cluster
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/5 text-slate-400">{rows.length} records</span>
        </h3>
        <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-300">
          <Crown size={11} /> {primaries} primary
        </span>
        <span className="text-xs text-slate-500 hidden sm:inline">· {rows.length - primaries} contextual · click for detail</span>
      </div>
      <div className="relative rounded-xl mx-3 mb-3 bg-ink-900/40 border border-white/[0.04] overflow-hidden backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] min-w-[820px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.1em] text-slate-500 border-b border-white/[0.06] bg-white/[0.02]">
                <th className="py-3 px-4 font-bold">Transaction</th>
                <th className="py-3 px-4 font-bold">Timestamp</th>
                <th className="py-3 px-4 font-bold">Payee</th>
                <th className="py-3 px-4 font-bold text-right">Amount</th>
                <th className="py-3 px-4 font-bold">Channel</th>
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Rule</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.transaction_id}
                  onClick={() => onSelect?.(t.transaction_id)}
                  className={`border-b border-white/[0.03] last:border-0 cursor-pointer transition-all duration-200 ${t.primary ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.07] hover:shadow-[inset_0_1px_0_rgba(251,191,36,0.1)]' : 'hover:bg-sky-500/[0.04] hover:shadow-[inset_0_1px_0_rgba(56,189,248,0.06)]'} group/row`}
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-sky-300 group-hover/row:text-sky-200 text-xs font-bold inline-flex items-center gap-2">
                      {t.transaction_id}
                      {t.primary && <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-amber-300 border border-amber-500/30 bg-amber-500/15 rounded-full px-2 py-0.5"><Crown size={10} /> PRIMARY</span>}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap inline-flex items-center gap-1.5"><Clock size={11} className="text-slate-600" />{formatDateTime(t.timestamp)}</td>
                  <td className="py-3 px-4 text-slate-200 font-medium">{t.payee}</td>
                  <td className={`py-3 px-4 text-right font-mono font-bold ${t.primary ? 'text-amber-300' : 'text-slate-200'}`}>{formatAmount(t.amount)}</td>
                  <td className="py-3 px-4"><span className="font-mono text-xs px-2 py-1 rounded-lg bg-white/[0.04] border border-white/5 text-slate-400 inline-flex items-center gap-1"><CreditCard size={10} />{t.channel}</span></td>
                  <td className="py-3 px-4"><span className="font-mono text-xs px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-slate-400 inline-flex items-center gap-1"><Tag size={10} />{t.transaction_type}</span></td>
                  <td className="py-3 px-4">
                    {(ruleByTx[t.transaction_id] ?? []).length ? (
                      <span className="inline-flex gap-1">
                        {(ruleByTx[t.transaction_id] ?? []).map((r) => (
                          <span key={r} className={`font-mono text-[11px] font-bold px-1.5 py-1 rounded border ${t.primary ? 'bg-rose-500/15 border-rose-500/25 text-rose-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>{r}</span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="px-5 pb-4 flex items-center gap-2 text-[11px] text-slate-600">
        <ShieldAlert size={11} className="text-amber-400/60" /> Primary = rule evidence · others = 24h contextual window
        <span className="ml-auto hidden sm:inline font-mono">Click any row → detail drawer</span>
      </div>
    </section>
  )
}
