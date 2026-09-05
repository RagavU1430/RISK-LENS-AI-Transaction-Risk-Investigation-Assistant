import { useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import ChartTip, { BAR_CURSOR, CHART_TIP_PROPS } from '../common/ChartTip.jsx'

const AXIS = { fontSize: 11, fill: '#64748b' }
const RULE_COLORS = { R01: '#38bdf8', R02: '#a78bfa', R03: '#fbbf24', R04: '#34d399', R05: '#fb7185' }
const SEV_COLORS = { HIGH: '#fb7185', MEDIUM: '#fbbf24', LOW: '#38bdf8' }

function Card({ title, icon, children }) {
  return (
    <div className="group relative rounded-2xl border border-white/[0.06] p-5 min-w-0 overflow-hidden card-elevated" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60" />
      <h3 className="relative text-white font-bold text-[13px] tracking-tight mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full" style={{ background: title.includes('Rule') ? '#38bdf8' : title.includes('Severity') ? '#fb7185' : '#8b5cf6' }} />
        {title}
      </h3>
      <div className="relative">{children}</div>
    </div>
  )
}

export function FindingsByRule({ data }) {
  return (
    <Card title="Findings by Rule">
      <div className="h-[220px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="rule" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTip />} cursor={BAR_CURSOR} {...CHART_TIP_PROPS} />
            <Bar dataKey="count" name="count" radius={[8, 8, 0, 0]}>
              {(data ?? []).map((d) => (
                <Cell key={d.rule} fill={RULE_COLORS[d.rule] ?? '#38bdf8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-slate-600 font-mono text-center">Deterministic · no AI</p>
    </Card>
  )
}

export function FindingsBySeverity({ data }) {
  const [active, setActive] = useState(null)
  const rows = data ?? []
  const current = active != null ? rows[active] : null
  const total = rows.reduce((sum, d) => sum + (d.count ?? 0), 0)
  return (
    <Card title="Findings by Severity">
      <div className="h-[220px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="count"
              nameKey="severity"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={3}
              strokeWidth={0}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {rows.map((d) => (
                <Cell key={d.severity} fill={SEV_COLORS[d.severity] ?? '#38bdf8'} opacity={current && current.severity !== d.severity ? 0.35 : 1} style={{ filter: current?.severity === d.severity ? 'drop-shadow(0 0 8px currentColor)' : undefined }} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-live="polite">
          <span className="text-[28px] font-extrabold text-white tabular-nums leading-none">
            {current ? current.count : total}
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] font-bold" style={{ color: current ? SEV_COLORS[current.severity] : '#64748b' }}>
            {current ? current.severity : 'Total'}
          </span>
          <span className="mt-1 text-[10px] font-mono text-slate-600">{current ? `${Math.round((current.count / Math.max(1, total)) * 100)}%` : 'findings'}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {(data ?? []).map((d) => (
          <span key={d.severity} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${current?.severity === d.severity ? 'bg-white/10 border-white/15 text-white shadow' : 'bg-white/[0.03] border-white/5 text-slate-400'}`}>
            <span className="w-2 h-2 rounded-full" style={{ background: SEV_COLORS[d.severity], boxShadow: `0 0 8px ${SEV_COLORS[d.severity]}60` }} />
            {d.severity} · {d.count}
          </span>
        ))}
      </div>
    </Card>
  )
}

export function InvestigationsOverTime({ data }) {
  return (
    <Card title="Investigation Activity">
      <div className="h-[220px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="invArea2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="invLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTip />} {...CHART_TIP_PROPS} />
            <Area type="monotone" dataKey="count" name="count" stroke="url(#invLine)" strokeWidth={2.5} fill="url(#invArea2)" dot={{ r: 3, fill: '#8b5cf6', stroke: 'white', strokeWidth: 1.5 }} activeDot={{ r: 5, fill: '#8b5cf6', stroke: 'white', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-slate-600 font-mono text-center">6-month window · live</p>
    </Card>
  )
}
