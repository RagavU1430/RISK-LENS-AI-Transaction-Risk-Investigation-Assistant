import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer.jsx'
import TransactionTable from '../components/transactions/TransactionTable.jsx'
import TransactionDetailModal from '../components/transactions/TransactionDetailModal.jsx'
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx'
import ErrorState from '../components/common/ErrorState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { getCustomers, getTransactions } from '../lib/api.js'

const inputCls = 'px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:bg-white/[0.06] focus:border-sky-500/30 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] transition-all duration-200'
const PAGE = 25

export default function Transactions() {
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [customers, setCustomers] = useState([])
  const [state, setState] = useState('loading')
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({
    search: params.get('search') ?? '',
    customer_id: '', channel: '', transaction_type: '', risk: 'all', offset: 0,
  })
  const [query, setQuery] = useState(params.get('search') ?? '')

  const load = useCallback(async (f) => {
    setState('loading')
    try {
      const [tx, cust] = await Promise.all([
        getTransactions({ ...f, search: f.search || undefined, limit: PAGE }),
        getCustomers(),
      ])
      setRows(tx.transactions ?? [])
      setTotal(tx.total ?? 0)
      setCustomers(cust.customers ?? [])
      setState('done')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => { load({ ...filters, offset: 0 }) }, [load])
  useEffect(() => {
    const s = params.get('search')
    if (s) setParams({}, { replace: true })
  }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => {
        if ((f.search ?? '') === query) return f
        const merged = { ...f, search: query, offset: 0 }
        load(merged)
        return merged
      })
    }, 350)
    return () => clearTimeout(t)
  }, [query, load])

  function apply(next) {
    const merged = { ...filters, ...next, offset: next.offset ?? 0 }
    if (next.offset === undefined) merged.offset = 0
    setFilters(merged)
    load(merged)
  }

  const page = Math.floor(filters.offset / PAGE) + 1
  const pages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <PageContainer
      eyebrow="Ledger"
      title="Transactions"
      description={`${total.toLocaleString('en-IN')} records · click any row for full detail, evidence link, and investigation trace.`}
    >
      <div className="rounded-2xl border border-white/[0.06] p-4 mb-6 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', backdropFilter: 'blur(12px)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.02] via-transparent to-violet-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-slate-500"><SlidersHorizontal size={12} className="text-sky-400" /> Filters</span>
          <span className="text-xs font-mono text-slate-600">· paginated · risk-annotated</span>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/5 text-slate-500">{total.toLocaleString('en-IN')} total</span>
        </div>
        <div className="relative flex flex-wrap gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ID, payee, description…" aria-label="Search transactions" className={`${inputCls} w-full pl-9`} />
          </div>
          <select aria-label="Customer filter" value={filters.customer_id} onChange={(e) => apply({ customer_id: e.target.value })} className={inputCls}>
            <option value="">All customers</option>
            {customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.customer_id}</option>)}
          </select>
          <select aria-label="Channel filter" value={filters.channel} onChange={(e) => apply({ channel: e.target.value })} className={inputCls}>
            <option value="">All channels</option>
            {['UPI', 'CARD', 'BANK_TRANSFER', 'NET_BANKING', 'ATM', 'CASH'].map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Type filter" value={filters.transaction_type} onChange={(e) => apply({ transaction_type: e.target.value })} className={inputCls}>
            <option value="">All types</option>
            {['PURCHASE', 'BILL_PAYMENT', 'TRANSFER', 'SALARY', 'RENT', 'WITHDRAWAL', 'SUBSCRIPTION', 'REFUND', 'UTILITY', 'FUEL', 'GROCERY', 'DINING', 'TRAVEL'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="Risk filter" value={filters.risk} onChange={(e) => apply({ risk: e.target.value })} className={`${inputCls} ${filters.risk !== 'all' ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
            <option value="all">All risk</option>
            <option value="flagged">Flagged</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {state === 'loading' && <LoadingSkeleton rows={8} />}
      {state === 'error' && <ErrorState onRetry={() => load(filters)} />}
      {state === 'done' && rows.length === 0 && (
        <EmptyState icon={ArrowLeftRight} title="No transactions found." description="No transactions match the selected filters. Try clearing filters or searching differently." />
      )}
      {state === 'done' && rows.length > 0 && (
        <>
          <TransactionTable items={rows} onSelect={setSelected} />
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs font-mono px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5 text-slate-500">Page {page} of {pages} · {total.toLocaleString('en-IN')} records</span>
            <div className="flex gap-2">
              <button type="button" disabled={filters.offset === 0} onClick={() => { const offset = Math.max(0, filters.offset - PAGE); setFilters((f) => ({ ...f, offset })); load({ ...filters, offset }) }} aria-label="Previous page" className="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-30 hover:border-white/10 text-slate-400 hover:text-white transition-all disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              <button type="button" disabled={filters.offset + PAGE >= total} onClick={() => { const offset = filters.offset + PAGE; setFilters((f) => ({ ...f, offset })); load({ ...filters, offset }) }} aria-label="Next page" className="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-30 hover:border-white/10 text-slate-400 hover:text-white transition-all disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
      <TransactionDetailModal transactionId={selected} onClose={() => setSelected(null)} />
    </PageContainer>
  )
}
