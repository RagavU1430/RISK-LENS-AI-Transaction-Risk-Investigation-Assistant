import { useEffect, useRef, useState } from 'react'

function useCountUp(value, duration = 900) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(Number(String(value).replace(/,/g, '')) || 0)
      return
    }
    const target = Number(String(value).replace(/,/g, '')) || 0
    const start = prev.current
    const diff = target - start
    if (diff === 0) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(start + diff * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else prev.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return display
}

export default function MetricCard({ label, value, sub, icon: Icon, accent = 'sky', trend }) {
  const accents = {
    sky: { icon: 'text-sky-300 bg-sky-500/12 border-sky-500/20 shadow-sky-500/10', glow: 'from-sky-500/10 to-transparent', text: 'text-sky-300' },
    amber: { icon: 'text-amber-300 bg-amber-500/12 border-amber-500/20 shadow-amber-500/10', glow: 'from-amber-500/10 to-transparent', text: 'text-amber-300' },
    rose: { icon: 'text-rose-300 bg-rose-500/12 border-rose-500/20 shadow-rose-500/10', glow: 'from-rose-500/10 to-transparent', text: 'text-rose-300' },
    emerald: { icon: 'text-emerald-300 bg-emerald-500/12 border-emerald-500/20 shadow-emerald-500/10', glow: 'from-emerald-500/10 to-transparent', text: 'text-emerald-300' },
    violet: { icon: 'text-violet-300 bg-violet-500/12 border-violet-500/20 shadow-violet-500/10', glow: 'from-violet-500/10 to-transparent', text: 'text-violet-300' },
  }
  const a = accents[accent] || accents.sky
  const numeric = Number(String(value).replace(/,/g, ''))
  const hasNum = Number.isFinite(numeric)
  const animated = useCountUp(hasNum ? value : 0)
  const shown = hasNum ? animated.toLocaleString('en-IN') : value

  return (
    <div className="group relative rounded-2xl border border-white/[0.06] p-5 overflow-hidden card-3d" style={{ background: 'linear-gradient(135deg, rgba(17,26,46,0.8) 0%, rgba(13,20,36,0.9) 100%)', backdropFilter: 'blur(12px)' }}>
      {/* subtle gradient orb */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${a.glow} pointer-events-none`} />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-bold">
            {label}
          </p>
          <p className="mt-2 text-[28px] leading-none font-extrabold tracking-tight text-white tabular-nums">
            {shown}
          </p>
          <div className="mt-2 flex items-center gap-2 min-h-[16px]">
            {sub && <p className="text-xs text-slate-500 leading-none">{sub}</p>}
            {trend && <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${trend.tone === 'up' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : trend.tone === 'down' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>{trend.label}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl border inline-flex items-center justify-center shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-1 ${a.icon}`}>
            <Icon size={18} strokeWidth={1.9} />
          </div>
        )}
      </div>
    </div>
  )
}
