import { useCallback, useEffect, useMemo, useState } from 'react'
import PageContainer from '../components/PageContainer.jsx'
import InvestigationTable from '../components/investigations/InvestigationTable.jsx'
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx'
import ErrorState from '../components/common/ErrorState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { FileSearch, Filter, Search, Sparkles, SlidersHorizontal } from 'lucide-react'
import { getCustomers, getInvestigations } from '../lib/api.js'

const inputCls = 'px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:bg-white/[0.06] focus:border-sky-500/30 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] transition-all duration-200'

export default function Investigations() {
  const [items, setItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [state, setState] = useState('loading')
  const [filters, setFilters] = useState({ severity: '', rule: '', customer: '', status: '', search: '' })

  const load = useCallback(async () => {
    setState('loading')
    try {
      const [inv, cust] = await Promise.all([getInvestigations({ limit: 1000 }), getCustomers()])
      setItems(inv.investigations ?? [])
      setCustomers(cust.customers ?? [])
      setState('done')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const rules = useMemo(() => {
    const s = new Set()
    for (const inv of items) for (const r of inv.rules ?? []) s.add(r.rule_id)
    return [...s].sort()
  }, [items])

  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return items.filter((inv) => {
      if (filters.severity && !(inv.severities ?? []).includes(filters.severity)) return false
      if (filters.rule && !(inv.rules ?? []).some((r) => r.rule_id === filters.rule)) return false
      if (filters.customer && inv.customer_id !== filters.customer) return false
      if (filters.status && statusOf(inv) !== filters.status) return false
      if (q && ![inv.investigation_id, inv.customer_id, ...(inv.finding_ids ?? [])].some((v) => String(v).toLowerCase().includes(q))) return false
      return true
    })
  }, [items, filters])

  return (
    <PageContainer
      eyebrow="Workspace"
      title="Investigations"
      description={`${
        items.length.toLocaleString('en-IN')
      } deterministic investigations — each a traceable evidence trail ready for review.`}
    >
      {state === 'loading' && <LoadingSkeleton rows={8} />}
      {state === 'error' && <ErrorState onRetry={load} />}
      {state === 'done' && (
        <>
          {/* Filters — glass, depth */}
          <div className="rounded-2xl border border-white/[0.06] p-4 mb-6 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', backdropFilter: 'blur(12px)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.02] via-transparent to-violet-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="relative flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-slate-500"><SlidersHorizontal size={12} className="text-sky-400" /> Filters</span>
              <span className="text-xs font-mono text-slate-600">· {visible.length} matches</span>
              {(filters.severity || filters.rule || filters.customer || filters.status || filters.search) && (
                <button type="button" onClick={() => setFilters({ severity: '', rule: '', customer: '', status: '', search: '' })} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors">Clear all</button>
              )}
            </div>
            <div className="relative flex flex-wrap gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Search ID, customer, finding…"
                  aria-label="Search investigations"
                  className={`${inputCls} w-full pl-9`}
                />
              </div>
              <select aria-label="Severity filter" value={filters.severity} onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))} className={inputCls}>
                <option value="">All severities</option>
                <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
              </select>
              <select aria-label="Rule filter" value={filters.rule} onChange={(e) => setFilters((f) => ({ ...f, rule: e.target.value }))} className={inputCls}>
                <option value="">All rules</option>
                {rules.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select aria-label="Customer filter" value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))} className={inputCls}>
                <option value="">All customers</option>
                {customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.customer_id}</option>)}
              </select>
              <select aria-label="Status filter" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                <option value="">All statuses</option>
                <option>Needs Investigation</option><option>Under Review</option><option>Monitoring</option>
              </select>
            </div>
          </div>

          {/* Quick stats */}
          {items.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'High', value: items.filter((i) => (i.severities ?? []).includes('HIGH')).length, color: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
                { label: 'Medium', value: items.filter((i) => (i.severities ?? []).includes('MEDIUM')).length, color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
                { label: 'Low', value: items.filter((i) => (i.severities ?? []).includes('LOW')).length, color: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border p-3 flex items-center justify-between ${s.color} backdrop-blur`}>
                  <span className="text-xs font-bold tracking-widest uppercase">{s.label}</span>
                  <span className="font-mono text-sm font-extrabold">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState icon={FileSearch} title="No investigations found." description="No investigations match the selected filters. Try clearing filters or searching differently." />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/5 text-slate-400">
                  <Filter size={11} /> {visible.length} of {items.length}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/15 text-sky-300">
                  <Sparkles size={11} /> deterministic · traceable
                </span>
              </div>
              <InvestigationTable items={visible.slice(0, 200)} />
            </>
          )}
        </>
      )}
    </PageContainer>
  )
}

function statusOf(inv) {
  const order = { HIGH: 3, MEDIUM: 2, LOW: 1 }
  let best = 'LOW'
  for (const s of inv.severities ?? []) {
    if ((order[s] ?? 0) >= (order[best] ?? 0)) best = s
  }
  return best === 'HIGH' ? 'Needs Investigation' : best === 'MEDIUM' ? 'Under Review' : 'Monitoring'
}
