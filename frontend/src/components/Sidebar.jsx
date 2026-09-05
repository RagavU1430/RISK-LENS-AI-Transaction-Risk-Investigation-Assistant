import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSearch,
  ArrowLeftRight,
  ShieldCheck,
  FileText,
  Sparkles,
  Zap,
  ChevronLeft,
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'Risk overview', end: true },
  { to: '/investigations', label: 'Investigations', icon: FileSearch, desc: 'Case workspace' },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, desc: 'Ledger explorer' },
  { to: '/evidence', label: 'Evidence', icon: ShieldCheck, desc: 'Trail & context' },
  { to: '/reports', label: 'Reports', icon: FileText, desc: 'Export & share' },
]

export default function Sidebar({ collapsed = false, onToggle }) {
  const { pathname } = useLocation()
  return (
    <aside
      className={`${collapsed ? 'w-[72px]' : 'w-[268px]'} shrink-0 h-screen sticky top-0 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-20`}
      style={{
        background: 'linear-gradient(180deg, rgba(13,20,36,0.95) 0%, rgba(7,12,22,0.98) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        boxShadow: '4px 0 32px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Logo — subtle 3D */}
      <div className="px-5 pt-6 pb-6 relative overflow-hidden">
        {/* ambient glow behind logo */}
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-sky-500/8 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -top-4 -right-8 w-24 h-24 bg-violet-500/6 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center gap-3.5 relative">
          <div className="relative group shrink-0 perspective">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/20 preserve-3d transition-transform duration-300 group-hover:rotate-y-6 group-hover:scale-105">
              <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-br from-white/12 to-transparent pointer-events-none" />
              <span className="relative text-white font-extrabold text-[13px] tracking-tight">RL</span>
              {/* shine */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            {/* floating dot */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-ink-850 shadow shadow-emerald-400/50 animate-pulse-subtle" />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0 animate-fade-in">
              <div className="flex items-baseline gap-1">
                <span className="text-white font-extrabold tracking-[0.16em] text-[13px]">RISK</span>
                <span className="text-sky-400 font-extrabold tracking-[0.16em] text-[13px]">LENS</span>
                <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest bg-sky-500/15 text-sky-300 border border-sky-500/20">AI</span>
              </div>
              <p className="text-[11px] font-medium tracking-[0.14em] text-slate-500 mt-0.5">Transaction Intelligence</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-4 flex items-center gap-2 text-[11px] animate-fade-in" style={{ animationDelay: '80ms' }}>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" /> Live
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] border border-white/5 text-slate-500 font-mono text-[10px]">PS06 • SOC</span>
          </div>
        )}
      </div>

      {/* Nav — depth + motion */}
      <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto" aria-label="Primary">
        {!collapsed && <p className="px-3 mb-2 text-[10px] font-bold tracking-[0.16em] text-slate-600 uppercase">Workspace</p>}
        {NAV.map(({ to, label, icon: Icon, desc, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-[11px] rounded-xl text-[13.5px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sky-500/[0.09] text-sky-200 border border-sky-500/20 shadow-[0_4px_16px_rgba(56,189,248,0.1),inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
              }${collapsed ? ' justify-center px-2' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sky-400 rounded-r-full shadow shadow-sky-400/50" />}
                <span className={`relative w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0 transition-all duration-200 ${isActive ? 'bg-sky-500/15 text-sky-300 shadow-inner' : 'bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-slate-300 border border-white/[0.03] group-hover:border-white/10'}`}>
                  <Icon size={16} strokeWidth={1.9} />
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block leading-none">{label}</span>
                    <span className={`block text-[11px] font-normal leading-none mt-1 ${isActive ? 'text-sky-300/70' : 'text-slate-600 group-hover:text-slate-500'}`}>{desc}</span>
                  </span>
                )}
                {!collapsed && isActive && <Zap size={12} className="text-sky-400/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom — investigation quick entry + status */}
      <div className="p-3 border-t border-white/[0.06] space-y-3" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.02))' }}>
        {!collapsed && (
          <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.03] backdrop-blur p-3.5">
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <span className="rounded-lg bg-ink-800/80 border border-white/5 py-1.5"><span className="block font-mono text-xs font-bold text-slate-200">766</span><span className="block text-[10px] text-slate-600 uppercase tracking-widest">Findings</span></span>
              <span className="rounded-lg bg-ink-800/80 border border-white/5 py-1.5"><span className="block font-mono text-xs font-bold text-rose-300">281</span><span className="block text-[10px] text-slate-600 uppercase tracking-widest">High</span></span>
              <span className="rounded-lg bg-ink-800/80 border border-white/5 py-1.5"><span className="block font-mono text-xs font-bold text-sky-300">20</span><span className="block text-[10px] text-slate-600 uppercase tracking-widest">Clients</span></span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12.5px] font-medium text-slate-500 hover:text-slate-200 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/10 transition-all duration-200"
        >
          <ChevronLeft size={14} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  )
}
