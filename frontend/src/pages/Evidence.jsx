import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, X, Search, Layers, Sparkles, Database } from 'lucide-react'
import PageContainer from '../components/PageContainer.jsx'
import SeverityBadge from '../components/common/SeverityBadge.jsx'
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx'
import ErrorState from '../components/common/ErrorState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { formatDateTime } from '../lib/format.js'
import { getCustomers, getEvidence } from '../lib/api.js'

const inputCls = 'px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-slate-200 focus:outline-none focus:bg-white/[0.06] focus:border-sky-500/30 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] transition-all duration-200'

export default function Evidence() {
  const [items, setItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [state, setState] = useState('loading')
  const [filters, setFilters] = useState({ customer_id: '', rule_id: '' })
  const [selected, setSelected] = useState(null)

  const load = useCallback(async (f) => {
    setState('loading')
    try {
      const [ev, cust] = await Promise.all([
        getEvidence({ ...f, summary: true }),
        getCustomers(),
      ])
      setItems(ev.evidence_packages ?? [])
      setCustomers(cust.customers ?? [])
      setState('done')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => { load({}) }, [load])

  function apply(next) {
    const merged = { ...filters, ...next }
    setFilters(merged)
    load(merged)
  }

  return (
    <PageContainer
      eyebrow="Case file"
      title="Evidence"
      description={`${items.length.toLocaleString('en-IN')} evidence packages — each a traceable trail from transaction to finding to investigation.`}
    >
      <div className="rounded-2xl border border-white/[0.06] p-4 mb-6 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', backdropFilter: 'blur(12px)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-sky-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative flex flex-wrap gap-2.5 items-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-slate-500"><Search size={12} className="text-emerald-400" /> Explore</span>
          <select aria-label="Customer filter" value={filters.customer_id} onChange={(e) => apply({ customer_id: e.target.value })} className={inputCls}>
            <option value="">All customers</option>
            {customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.customer_id}</option>)}
          </select>
          <select aria-label="Rule filter" value={filters.rule_id} onChange={(e) => apply({ rule_id: e.target.value })} className={inputCls}>
            <option value="">All rules</option>
            {['R01', 'R02', 'R03', 'R04', 'R05'].map((r) => <option key={r}>{r}</option>)}
          </select>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-white/[0.04] border border-white/5 text-slate-500">
            <Layers size={12} /> {items.length} packages
          </span>
        </div>
      </div>

      {state === 'loading' && <LoadingSkeleton rows={8} />}
      {state === 'error' && <ErrorState onRetry={() => load(filters)} />}
      {state === 'done' && items.length === 0 && (
        <EmptyState icon={ShieldCheck} title="No evidence matches the selected filters." description="Adjust the filters to explore collected evidence. Each package links a finding to its source transactions and baseline." />
      )}
      {state === 'done' && items.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden relative" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] min-w-[860px] relative">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-slate-500 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur">
                  <th className="py-3.5 px-5 font-bold">Evidence</th>
                  <th className="py-3.5 px-4 font-bold">Customer</th>
                  <th className="py-3.5 px-4 font-bold">Rule</th>
                  <th className="py-3.5 px-4 font-bold">Severity</th>
                  <th className="py-3.5 px-4 font-bold">Transactions</th>
                  <th className="py-3.5 px-4 font-bold">Payees</th>
                  <th className="py-3.5 px-4 font-bold">Source</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 200).map((e) => (
                  <tr key={e.finding_id} onClick={() => setSelected(e)} className="border-b border-white/[0.03] last:border-0 hover:bg-emerald-500/[0.04] cursor-pointer group/row transition-colors">
                    <td className="py-3 px-5 font-mono text-sky-300 group-hover/row:text-sky-200 text-xs font-bold">{e.finding_id}</td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-300 bg-white/[0.03] border border-white/5 rounded-lg px-2 py-1 text-center inline-flex mt-2">{e.customer_id}</td>
                    <td className="py-3 px-4 font-mono text-xs"><span className="font-bold text-slate-200">{e.rule_id}</span> <span className="text-slate-500 hidden lg:inline">· {e.rule_name}</span></td>
                    <td className="py-3 px-4"><SeverityBadge severity={e.severity} /></td>
                    <td className="py-3 px-4"><span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-1 rounded-lg bg-white/[0.04] border border-white/5 text-slate-300"><Database size={11} className="text-slate-500" />{e.primary_count}+{e.related_count}</span></td>
                    <td className="py-3 px-4 text-slate-400 text-xs truncate max-w-[140px]">{(e.payees ?? []).join(', ') || '—'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">evidence.json</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-white/[0.015] border-t border-white/[0.04] flex items-center justify-between text-xs">
            <span className="text-slate-600 font-mono">Showing {Math.min(200, items.length)} of {items.length} · click for detail</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-500"><Sparkles size={11} className="text-emerald-400" /> Traceable to transactions.csv</span>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label="Evidence detail">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg my-8 max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-ink-850 shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease-out]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300"><ShieldCheck size={18} /></span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-500">Evidence {selected.finding_id}</p>
                    <h3 className="mt-1 text-white font-bold flex items-center gap-2">{selected.rule_id} <span className="text-slate-500 font-normal">· {selected.rule_name}</span> <SeverityBadge severity={selected.severity} /></h3>
                  </div>
                </div>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-2.5 text-[13px]">
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Customer</span> <span className="font-mono font-semibold text-slate-200">{selected.customer_id}</span></p>
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Anchor</span> <span className="font-mono text-slate-300">{formatDateTime(selected.anchor_timestamp)}</span></p>
                <p className="flex justify-between"><span className="text-slate-500 font-medium">Evidence</span> <span className="font-mono text-slate-300">{selected.primary_count} primary · {selected.related_count} related</span></p>
                {(selected.payees ?? []).length > 0 && <p className="flex justify-between"><span className="text-slate-500 font-medium">Payees</span> <span className="text-slate-300 text-right max-w-[180px] truncate">{selected.payees.join(', ')}</span></p>}
              </div>
              <Link
                to={`/investigations/${selected.investigation_id}`}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[13px] font-bold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                Open investigation <ArrowRight size={15} />
              </Link>
              <p className="mt-3 text-center text-[11px] font-mono text-slate-600">Traceable · evidence.json → transactions.csv</p>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
