import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import ChatWidget from '../components/chat/ChatWidget.jsx'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [phase, setPhase] = useState('enter')

  // Subtle route transition — UX polish without distraction
  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setPhase('exit')
      const t = setTimeout(() => {
        setDisplayLocation(location)
        setPhase('enter')
      }, 120)
      return () => clearTimeout(t)
    }
  }, [location, displayLocation.pathname])

  return (
    <div className="min-h-screen bg-ink-900 flex selection:bg-sky-500/20 selection:text-sky-100">
      {/* ambient orbs — fixed, behind content */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-[90px] opacity-[0.07]" style={{ background: 'radial-gradient(circle, #38bdf8, transparent 70%)' }} />
        <div className="absolute top-[30%] -right-32 w-[480px] h-[480px] rounded-full blur-[100px] opacity-[0.06]" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[300px] rounded-full blur-[80px] opacity-[0.04]" style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }} />
        {/* scanline */}
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/10 to-transparent opacity-60" style={{ animation: 'scanline 8s linear infinite' }} />
      </div>

      <div className="hidden md:block shrink-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen relative">
        <Topbar />

        <main
          key={displayLocation.pathname}
          className={`flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 ${phase === 'enter' ? 'animate-[slideUp_0.35s_ease-out]' : 'opacity-0 translate-y-1'} transition-all duration-150`}
        >
          <Outlet />
        </main>

        <footer className="border-t border-white/[0.04] bg-ink-950/40 backdrop-blur">
          <div className="px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-2 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow shadow-emerald-400/50" />
              Backend <span className="text-slate-300 font-medium">Live</span>
              <span className="w-px h-3 bg-white/10 mx-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow shadow-sky-400/50" />
              API <span className="text-slate-300 font-medium">v1</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-600">
              Deterministic engine is source of truth · AI explains only
            </span>
            <span className="ml-auto font-mono text-slate-600">
              RISK LENS AI · <span className="text-slate-400">PS06</span> · SOC Workstation
            </span>
          </div>
        </footer>
        <ChatWidget />
      </div>
    </div>
  )
}
