import { Link } from 'react-router-dom'
import { ArrowRight, Clock, ExternalLink } from 'lucide-react'
import SeverityBadge from '../common/SeverityBadge.jsx'
import { formatDateTime, statusForSeverity } from '../../lib/format.js'

export default function RecentInvestigations({ items }) {
  if (!items?.length) return null
  return (
    <div className="group relative rounded-2xl border border-white/[0.06] overflow-hidden card-elevated" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative flex items-center justify-between p-5 pb-3">
        <div>
          <h3 className="text-white font-bold text-[14px] tracking-tight flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-sky-400" />
            Recent Investigations
            <span className="ml-2 text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 text-slate-400">live · 8</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Latest deterministic findings — click to investigate</p>
        </div>
        <Link to="/investigations" className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-sky-500/10 border border-white/10 hover:border-sky-500/20 text-xs font-semibold text-slate-300 hover:text-sky-300 transition-all duration-200">
          View all <ArrowRight size={13} />
        </Link>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[720px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.1em] text-slate-500 border-y border-white/[0.06] bg-white/[0.02]">
              <th className="py-3 px-5 font-bold">Investigation</th>
              <th className="py-3 px-4 font-bold">Customer</th>
              <th className="py-3 px-4 font-bold">Trigger</th>
              <th className="py-3 px-4 font-bold">Severity</th>
              <th className="py-3 px-4 font-bold">Txns</th>
              <th className="py-3 px-4 font-bold">Detected</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-5 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((inv, idx) => (
              <tr key={inv.investigation_id} className="border-b border-white/[0.03] last:border-0 hover:bg-sky-500/[0.04] group/row transition-colors" style={{ animationDelay: `${idx * 40}ms` }}>
                <td className="py-3.5 px-5">
                  <Link to={`/investigations/${inv.investigation_id}`} className="font-mono text-sky-300 group-hover/row:text-sky-200 text-xs font-semibold hover:underline inline-flex items-center gap-1.5">
                    {inv.investigation_id} <ExternalLink size={10} className="opacity-40 group-hover/row:opacity-100 transition-opacity" />
                  </Link>
                </td>
                <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-300">{inv.customer_id}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex gap-1">
                    {inv.rules.map((r) => (
                      <span key={r.rule_id} className="font-mono text-[11px] font-bold px-1.5 py-1 rounded bg-white/[0.06] border border-white/10 text-slate-300">{r.rule_id}</span>
                    ))}
                  </span>
                </td>
                <td className="py-3.5 px-4"><SeverityBadge severity={inv.max_severity} /></td>
                <td className="py-3.5 px-4"><span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.04] border border-white/5 font-mono text-xs font-bold text-slate-300">{inv.transaction_count}</span></td>
                <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap inline-flex items-center gap-1.5"><Clock size={11} className="text-slate-600" />{formatDateTime(inv.detected_at)}</td>
                <td className="py-3.5 px-4"><span className={`text-xs font-medium px-2 py-1 rounded-full border ${inv.max_severity === 'HIGH' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : inv.max_severity === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-sky-500/10 border-sky-500/20 text-sky-300'}`}>{statusForSeverity(inv.max_severity)}</span></td>
                <td className="py-3.5 px-5 text-right">
                  <Link
                    to={`/investigations/${inv.investigation_id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/20 text-xs font-semibold transition-all duration-200 hover:shadow hover:shadow-sky-500/20"
                    aria-label={`View ${inv.investigation_id}`}
                  >
                    View <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 bg-white/[0.015] border-t border-white/[0.04] flex items-center justify-between text-xs">
        <span className="text-slate-600 font-mono">8 of 766 · deterministic · sorted by recency</span>
        <Link to="/investigations" className="sm:hidden text-sky-400 font-medium inline-flex items-center gap-1">View all <ArrowRight size={12} /></Link>
      </div>
    </div>
  )
}
