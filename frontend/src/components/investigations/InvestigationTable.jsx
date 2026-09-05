import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink, Clock } from 'lucide-react'
import SeverityBadge from '../common/SeverityBadge.jsx'
import { formatDateTime, statusForSeverity } from '../../lib/format.js'

export default function InvestigationTable({ items }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden relative group" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[880px] relative">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.1em] text-slate-500 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur">
              <th className="py-3.5 px-5 font-bold">Investigation</th>
              <th className="py-3.5 px-4 font-bold">Customer</th>
              <th className="py-3.5 px-4 font-bold">Finding</th>
              <th className="py-3.5 px-4 font-bold">Rule</th>
              <th className="py-3.5 px-4 font-bold">Severity</th>
              <th className="py-3.5 px-4 font-bold">Txns</th>
              <th className="py-3.5 px-4 font-bold">Detected</th>
              <th className="py-3.5 px-4 font-bold">Status</th>
              <th className="py-3.5 px-5 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((inv, idx) => (
              <tr
                key={inv.investigation_id}
                className="border-b border-white/[0.03] last:border-0 hover:bg-sky-500/[0.04] group/row transition-colors duration-200"
                style={{ animationDelay: `${idx * 20}ms` }}
              >
                <td className="py-3.5 px-5">
                  <Link to={`/investigations/${inv.investigation_id}`} className="font-mono text-sky-300 group-hover/row:text-sky-200 text-xs font-bold hover:underline inline-flex items-center gap-1.5">
                    {inv.investigation_id} <ExternalLink size={10} className="opacity-30 group-hover/row:opacity-100 transition-opacity" />
                  </Link>
                </td>
                <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-300 bg-white/[0.03] rounded-lg border border-white/5 px-2 py-1 text-center">{inv.customer_id}</td>
                <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{(inv.finding_ids ?? []).join(', ')}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex gap-1">
                    {inv.rules.map((r) => (
                      <span key={r.rule_id} className="font-mono text-[11px] font-bold px-1.5 py-1 rounded bg-white/[0.06] border border-white/10 text-slate-300 group-hover/row:bg-sky-500/10 group-hover/row:border-sky-500/20 group-hover/row:text-sky-300 transition-colors">{r.rule_id}</span>
                    ))}
                  </span>
                </td>
                <td className="py-3.5 px-4"><SeverityBadge severity={inv.max_severity} /></td>
                <td className="py-3.5 px-4"><span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.04] border border-white/5 font-mono text-xs font-bold text-slate-300">{inv.transaction_count}</span></td>
                <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap inline-flex items-center gap-1.5"><Clock size={11} className="text-slate-600" />{formatDateTime(inv.detected_at)}</td>
                <td className="py-3.5 px-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${inv.max_severity === 'HIGH' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : inv.max_severity === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-sky-500/10 border-sky-500/20 text-sky-300'}`}>{statusForSeverity(inv.max_severity)}</span></td>
                <td className="py-3.5 px-5 text-right">
                  <Link
                    to={`/investigations/${inv.investigation_id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/20 text-xs font-bold transition-all duration-200 hover:shadow hover:shadow-sky-500/20 hover:-translate-y-0.5"
                    aria-label={`Open ${inv.investigation_id}`}
                  >
                    Open <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 bg-white/[0.015] border-t border-white/[0.04] flex items-center justify-between text-xs">
        <span className="text-slate-600 font-mono">Showing {items.length} investigations · deterministic</span>
        <span className="hidden sm:inline text-slate-500">Click any row to investigate</span>
      </div>
    </div>
  )
}
