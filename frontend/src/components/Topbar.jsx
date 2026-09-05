import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Brain, Search, Bell, Shield, ChevronRight, ExternalLink, Sparkles } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import { getAiStatus } from '../lib/api.js'

const TITLES = [
  { match: (p) => p.startsWith('/investigations/'), title: 'Investigation', crumb: ['Investigations', 'Detail'], desc: 'Evidence workspace' },
  { match: (p) => p === '/investigations', title: 'Investigations', crumb: ['Workspace', 'Investigations'], desc: 'Case management' },
  { match: (p) => p === '/transactions', title: 'Transactions', crumb: ['Ledger', 'Transactions'], desc: 'Explorer & analysis' },
  { match: (p) => p === '/evidence', title: 'Evidence', crumb: ['Case file', 'Evidence'], desc: 'Trail & context' },
  { match: (p) => p === '/reports', title: 'Reports', crumb: ['Output', 'Reports'], desc: 'Export & share' },
  { match: () => true, title: 'Dashboard', crumb: ['Operations', 'Overview'], desc: 'Risk posture · Live' },
]

export default function Topbar() {
  const { pathname } = useLocation()
  const [ai, setAi] = useState(null)
  const active = TITLES.find((t) => t.match(pathname))

  useEffect(() => {
    getAiStatus().then(setAi).catch(() => setAi({ available: false }))
  }, [])

  const invId = pathname.match(/^\/investigations\/(INV-[^/]+)/)?.[1]

  return (
    <header className="h-[68px] shrink-0 flex items-center gap-4 px-6 border-b border-white/[0.06] sticky top-0 z-10" style={{ background: 'rgba(10,15,26,0.72)', backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)' }}>
      {/* subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-sky-500/[0.02] via-transparent to-violet-500/[0.02] pointer-events-none" />

      <div className="min-w-0 flex-1 relative">
        {/* breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Shield size={11} className="text-slate-600" /> RISK LENS AI
          </span>
          <ChevronRight size={12} className="text-slate-700" />
          <span className="text-slate-600">{active.crumb[0]}</span>
          <ChevronRight size={12} className="text-slate-700" />
          <span className="text-slate-200 font-semibold">{active.crumb[1]}</span>
          {invId && (
            <>
              <ChevronRight size={12} className="text-slate-700" />
              <Link to={`/investigations/${invId}`} className="font-mono text-sky-300 hover:text-sky-200 transition-colors">{invId}</Link>
            </>
          )}
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <h1 className="text-[17px] font-bold tracking-tight text-white leading-none">
            {active.title}
          </h1>
          <span className="hidden sm:inline text-xs text-slate-500 font-normal">· {active.desc}</span>
          {invId && <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-300">INV · Detail</span>}
        </div>
      </div>

      {/* center — search placeholder (visual only for now) */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5 text-slate-500 hover:bg-white/[0.06] hover:border-white/10 transition-colors cursor-text">
        <Search size={14} />
        <span className="text-[13px] pr-8">Search investigations…</span>
        <span className="ml-2 text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-slate-400">⌘K</span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* AI status — distinct pill */}
        {ai === null ? (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.04] border border-white/5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" /> AI · …
          </span>
        ) : ai.available ? (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-200 shadow shadow-violet-500/10">
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-60" /><span className="relative w-2 h-2 rounded-full bg-violet-400" /></span>
            <Brain size={13} /> Gemini Live
            <Sparkles size={11} className="text-violet-400/70" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.04] border border-white/5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-600" /> <Brain size={13} /> AI Offline
          </span>
        )}
        <span className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-xs font-medium text-emerald-300">
          <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" /><span className="relative w-2 h-2 rounded-full bg-emerald-400" /></span>
          Operational
        </span>
        <button type="button" aria-label="Notifications" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] hover:border-white/10 flex items-center justify-center transition-all">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}
