import { maxSeverity, formatAmount } from '../../lib/format.js'
import SeverityBadge from '../common/SeverityBadge.jsx'
import { Layers, Wallet, Users, Zap } from 'lucide-react'

function Stat({ label, value, sub, icon: Icon, accent = 'slate' }) {
  const tones = {
    sky: 'bg-sky-500/10 border-sky-500/15 text-sky-300',
    amber: 'bg-amber-500/10 border-amber-500/15 text-amber-300',
    rose: 'bg-rose-500/10 border-rose-500/15 text-rose-300',
    emerald: 'bg-emerald-500/10 border-emerald-500/15 text-emerald-300',
    violet: 'bg-violet-500/10 border-violet-500/15 text-violet-300',
    slate: 'bg-white/[0.03] border-white/5 text-slate-400',
  }
  return (
    <div className="group relative rounded-xl border border-white/[0.06] p-4 overflow-hidden hover:border-white/10 hover:bg-white/[0.03] transition-all duration-200" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-slate-500">{label}</p>
          <p className="mt-1.5 text-[15px] font-bold text-white tracking-tight truncate">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500 truncate">{sub}</p>}
        </div>
        {Icon && <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${tones[accent]}`}><Icon size={14} /></span>}
      </div>
    </div>
  )
}

export default function RiskSummary({ investigation }) {
  const findings = investigation.findings ?? []
  const txIds = [...new Set(findings.flatMap((f) => f.transaction_ids ?? []))]
  const payees = [...new Set(
    (investigation.evidence_packages ?? []).flatMap((p) => (p.primary_transactions ?? []).map((t) => t.payee))
  )].filter(Boolean)
  const channels = [...new Set(
    (investigation.evidence_packages ?? []).flatMap((p) => (p.primary_transactions ?? []).map((t) => t.channel))
  )].filter(Boolean)
  const total = (investigation.evidence_packages ?? []).reduce(
    (s, p) => s + (p.primary_transactions ?? []).reduce((a, t) => a + Number(t.amount ?? 0), 0), 0)
  const sev = maxSeverity(findings.map((f) => f.severity))

  return (
    <section aria-label="Risk summary">
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300"><Layers size={11} /> DETERMINISTIC</span>
        <h3 className="text-white font-bold text-[15px] tracking-tight">Risk Summary</h3>
        <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/5 text-slate-500"><Zap size={11} className="text-amber-400" /> {findings.length} rule{findings.length === 1 ? '' : 's'} · {txIds.length} txn</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Triggered rules" value={`${new Set(findings.map((f) => f.rule_id)).size} rules`} sub={[...new Set(findings.map((f) => f.rule_id))].join(' · ')} icon={Layers} accent="sky" />
        <Stat label="Transactions" value={`${txIds.length} involved`} sub="Primary evidence" icon={Wallet} accent="violet" />
        <Stat label="Combined amount" value={formatAmount(total)} sub="Primary set" icon={Wallet} accent="amber" />
        <div className="rounded-xl border border-white/[0.06] p-4 flex flex-col justify-center" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
          <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-slate-500">Peak severity</p>
          <p className="mt-2"><SeverityBadge severity={sev} /></p>
        </div>
        <Stat label="Payees" value={payees.length ? payees.slice(0, 2).join(', ') : '—'} sub={payees.length > 2 ? `+${payees.length - 2} more` : payees.length ? 'Primary payee' : '—'} icon={Users} accent="emerald" />
        <Stat label="Channels" value={channels.length ? channels.join(', ') : '—'} sub={channels.length ? 'Observed' : '—'} icon={Layers} accent="slate" />
      </div>
    </section>
  )
}
