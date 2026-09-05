import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import ChartTip, { BAR_CURSOR, CHART_TIP_PROPS } from '../common/ChartTip.jsx'
import { formatAmount } from '../../lib/format.js'
import { User, Clock, CreditCard, TrendingUp, Activity, Wallet } from 'lucide-react'

function Stat({ label, value, accent = false, icon: Icon }) {
  return (
    <div className="group relative rounded-xl border border-white/[0.06] p-4 overflow-hidden hover:border-white/10 hover:bg-white/[0.03] transition-all duration-200" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-slate-500">{label}</p>
          <p className={`mt-1.5 font-bold text-[14px] tracking-tight truncate ${accent ? 'text-sky-300 font-mono' : 'text-white'}`}>{value}</p>
        </div>
        {Icon && <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${accent ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' : 'bg-white/[0.04] border-white/5 text-slate-500'}`}><Icon size={13} /></span>}
      </div>
    </div>
  )
}

// Human-readable baseline — observed vs normal, with depth and clarity.
export default function BehavioralBaseline({ evidencePackage }) {
  const ctx = evidencePackage?.customer_context ?? {}
  const cmp = evidencePackage?.baseline_comparison ?? {}
  const dist = ctx.time_distribution ?? {}
  const distData = Object.entries(dist).map(([bucket, pct]) => ({ bucket: bucket.replace(':00', ''), pct }))

  const channel = (ctx.normal_channels ?? [])[0]
  const payee = (ctx.normal_payees ?? [])[0]
  const observed = cmp.observed
  const median = ctx.median_amount
  const deviation = cmp.ratio ? `${cmp.ratio}×` : cmp.deviation != null ? String(cmp.deviation) : '—'
  const isHighDeviation = cmp.ratio != null && cmp.ratio >= 5

  return (
    <section aria-label="Behavioral baseline" className="rounded-2xl border border-white/[0.06] p-6 overflow-hidden relative" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.02] via-transparent to-violet-500/[0.02] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-white font-bold text-[15px] tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-300"><Activity size={14} /></span>
              Customer Behavioral Baseline
            </h3>
            <p className="text-xs text-slate-500 mt-1">What is normal for this customer — vs what was observed</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${isHighDeviation ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/15 text-emerald-300'}`}>
              <TrendingUp size={11} /> {isHighDeviation ? 'Significant deviation' : 'Within context'}
            </span>
          </div>
        </div>

        {/* Observed vs Normal — hero comparison */}
        <div className="grid md:grid-cols-[1.1fr_auto_1.1fr] gap-3 items-stretch mb-5">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent pointer-events-none" />
            <p className="relative text-[11px] uppercase tracking-[0.1em] font-bold text-sky-300 flex items-center gap-1.5"><Wallet size={11} /> Observed</p>
            <p className="relative mt-1 font-mono text-xl font-extrabold text-white">{observed !== undefined ? formatAmount(observed) : '—'}</p>
            <p className="relative mt-1 text-xs text-sky-200/70">This investigation</p>
          </div>
          <div className="hidden md:flex flex-col items-center justify-center gap-1 text-slate-500">
            <span className="text-[11px] font-bold tracking-widest uppercase">vs</span>
            <span className="w-px h-8 bg-white/10" />
            <span className={`text-xs font-mono font-bold px-2 py-1 rounded-full border ${isHighDeviation ? 'bg-rose-500/15 border-rose-500/20 text-rose-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>{deviation}</span>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 relative overflow-hidden">
            <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-slate-500 flex items-center gap-1.5"><User size={11} /> Customer normal</p>
            <p className="mt-1 font-mono text-xl font-extrabold text-white">{median !== undefined ? formatAmount(median) : '—'}</p>
            <p className="mt-1 text-xs text-slate-500">Historical median</p>
            <p className="md:hidden mt-2 text-xs font-mono font-bold inline-flex px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">{deviation}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Stat label="Historical median" value={ctx.median_amount !== undefined ? formatAmount(ctx.median_amount) : '—'} accent icon={Wallet} />
          <Stat label="Historical average" value={ctx.average_amount !== undefined ? formatAmount(ctx.average_amount) : '—'} icon={TrendingUp} />
          <Stat label="Common channel" value={channel ? `${channel[0]} · ${channel[1]}×` : '—'} icon={CreditCard} />
          <Stat label="Top payee" value={payee ? `${payee[0]}` : '—'} icon={User} />
          <Stat label="Typical hour" value={ctx.typical_transaction_hour !== undefined ? `${String(ctx.typical_transaction_hour).padStart(2, '0')}:00` : '—'} icon={Clock} />
          <Stat label="Daily average" value={ctx.typical_transaction_count_per_day !== undefined ? `${ctx.typical_transaction_count_per_day}/day` : '—'} icon={Activity} />
          <Stat label="Total txns" value={ctx.total_transactions != null ? String(ctx.total_transactions) : '—'} icon={Wallet} />
          <Stat label="Avg amount" value={ctx.average_amount !== undefined ? formatAmount(ctx.average_amount) : '—'} accent icon={TrendingUp} />
        </div>

        {distData.length > 0 ? (
          <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: 'rgba(255,255,255,0.015)', backdropFilter: 'blur(8px)' }}>
            <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 flex items-center gap-2 mb-3"><Clock size={12} className="text-sky-400" /> Normal activity by time of day (%) <span className="ml-auto text-[11px] font-mono font-normal normal-case tracking-normal text-slate-600">hover for %</span></p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-18} dy={8} height={44} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} cursor={BAR_CURSOR} {...CHART_TIP_PROPS} />
                  <Bar dataKey="pct" name="pct" radius={[8, 8, 0, 0]}>
                    {distData.map((d) => <Cell key={d.bucket} fill={d.pct > 20 ? '#38bdf8' : d.pct > 10 ? '#818cf8' : '#475569'} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] p-8 text-center" style={{ background: 'rgba(255,255,255,0.015)' }}>
            <p className="text-[13px] text-slate-500">Baseline visualization unavailable for this investigation.</p>
            <p className="text-xs text-slate-600 mt-1">Evidence still traceable via timeline and transactions</p>
          </div>
        )}
      </div>
    </section>
  )
}
