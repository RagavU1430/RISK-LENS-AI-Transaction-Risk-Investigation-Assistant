import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Zap, Activity, Eye, ArrowUpRight, Database, Network } from 'lucide-react'

// Lightweight 3D transaction-risk network — pure SVG + CSS transforms.
// No Three.js needed; uses perspective, floating layers, and animated connections.
// Falls back gracefully if motion is reduced.
export default function DashboardHero3D({ stats, onInvestigate }) {
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hoverNode, setHoverNode] = useState(null)

  // Subtle mouse-follow tilt (disabled for reduced motion via CSS)
  useEffect(() => {
    const el = wrapRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = ((e.clientY - r.top) / r.height - 0.5) * -6
        const y = ((e.clientX - r.left) / r.width - 0.5) * 8
        setTilt({ x, y })
      })
    }
    const onLeave = () => setTilt({ x: 0, y: 0 })
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  const highPct = stats?.findings ? Math.round((stats.high_severity / stats.findings) * 100) : 0

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-[20px] border border-white/[0.07]"
      style={{
        background: 'linear-gradient(135deg, rgba(17,26,46,0.9) 0%, rgba(13,20,36,0.95) 50%, rgba(10,15,26,0.98) 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
        perspective: '1200px',
      }}
    >
      {/* ambient orbs */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.4), transparent 70%)' }} />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)' }} />
      <div className="absolute inset-0 grid-pattern opacity-[0.03] pointer-events-none" />
      {/* top scanline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />

      <div className="relative grid lg:grid-cols-[1.15fr_0.85fr] gap-0">
        {/* Left — editorial */}
        <div className="p-7 sm:p-8 lg:p-9">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/15 text-xs font-medium text-sky-300 backdrop-blur">
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-sky-400 animate-ping opacity-50" /><span className="relative w-2 h-2 rounded-full bg-sky-400" /></span>
            Risk Operations Center · Live
            <span className="ml-1 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[10px] text-slate-300">SOC</span>
          </div>
          <h2 className="mt-4 text-[28px] sm:text-[32px] font-extrabold tracking-tight leading-[0.95] text-white">
            Transaction
            <span className="block bg-gradient-to-r from-sky-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">Risk Intelligence.</span>
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-slate-400 max-w-[46ch]">
            Customer-specific behavioral baselines · deterministic <span className="text-slate-300 font-medium">R01–R05</span> · evidence trail · grounded AI explanation.
            <span className="text-slate-300"> Investigators see what triggered, why, and what to check next.</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/investigations')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[13.5px] font-semibold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              <Eye size={16} /> Open Investigations <ArrowUpRight size={14} className="opacity-70" />
            </button>
            <button
              type="button"
              onClick={() => onInvestigate?.()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/10 hover:border-white/15 text-slate-200 text-[13.5px] font-medium backdrop-blur transition-all duration-200"
            >
              <Network size={16} className="text-slate-400" /> View Network
            </button>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-3 max-w-[420px]">
            {[
              { k: 'Investigations', v: stats?.investigations, icon: Shield, tint: 'sky' },
              { k: 'High severity', v: stats?.high_severity, icon: Zap, tint: 'rose' },
              { k: 'Coverage', v: `${highPct}%`, sub: 'high share', icon: Activity, tint: 'violet' },
            ].map(({ k, v, sub, icon: Icon, tint }) => (
              <div key={k} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 backdrop-blur">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${tint === 'sky' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/20' : tint === 'rose' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' : 'bg-violet-500/15 text-violet-300 border border-violet-500/20'}`}>
                  <Icon size={13} />
                </div>
                <p className="font-mono text-[15px] font-bold text-white leading-none">{v ?? '—'}</p>
                <p className="text-[11px] font-medium text-slate-500 leading-none mt-1">{k}</p>
                {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Right — 3D network */}
        <div className="relative min-h-[320px] lg:min-h-[380px] p-4 sm:p-6 flex items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(600px 300px at 50% 0%, rgba(56,189,248,0.06), transparent 60%)' }}>
          {/* depth layers */}
          <div
            className="relative w-full max-w-[420px] aspect-[1.15] preserve-3d"
            style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)' }}
          >
            {/* floating shadow */}
            <div className="absolute inset-6 rounded-[24px] bg-sky-500/5 blur-2xl" style={{ transform: 'translateZ(-40px)' }} />
            {/* card */}
            <div className="absolute inset-0 rounded-[20px] border border-white/[0.07] overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))', backdropFilter: 'blur(12px)', transform: 'translateZ(0px)' }}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="h-9 flex items-center justify-between px-4 border-b border-white/[0.06] bg-white/[0.02]">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase"><Database size={12} className="text-sky-400" /> Live Network</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" /> Streaming</span>
              </div>
              {/* SVG network */}
              <div className="relative p-3">
                <svg viewBox="0 0 380 260" className="w-full h-auto" role="img" aria-label="Customer transaction to payee network, risk nodes highlighted">
                  <defs>
                    <radialGradient id="g-customer" cx="50%" cy="50%"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" /><stop offset="100%" stopColor="#38bdf8" stopOpacity="0" /></radialGradient>
                    <radialGradient id="g-risk" cx="50%" cy="50%"><stop offset="0%" stopColor="#fb7185" stopOpacity="0.45" /><stop offset="100%" stopColor="#fb7185" stopOpacity="0" /></radialGradient>
                    <filter id="glow-sky"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>
                  {/* connections */}
                  {[
                    { x1: 190, y1: 78, x2: 90, y2: 38 }, { x1: 190, y1: 78, x2: 190, y2: 28 }, { x1: 190, y1: 78, x2: 290, y2: 38 },
                    { x1: 190, y1: 78, x2: 70, y2: 148 }, { x1: 190, y1: 78, x2: 145, y2: 172 }, { x1: 190, y1: 78, x2: 235, y2: 172 }, { x1: 190, y1: 78, x2: 310, y2: 148 },
                    { x1: 70, y1: 148, x2: 52, y2: 220 }, { x1: 145, y1: 172, x2: 128, y2: 230 }, { x1: 235, y1: 172, x2: 252, y2: 230 }, { x1: 310, y1: 148, x2: 328, y2: 220 },
                  ].map((l, i) => (
                    <g key={i}>
                      <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(148,163,184,0.18)" strokeWidth="1.2" />
                      <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(56,189,248,0.55)" strokeWidth="1.2" strokeDasharray="4 6" strokeLinecap="round" opacity="0.9">
                        <animate attributeName="stroke-dashoffset" from="20" to="0" dur={`${1.8 + (i % 3) * 0.3}s`} repeatCount="indefinite" />
                      </line>
                    </g>
                  ))}
                  {/* customer center */}
                  <g onMouseEnter={() => setHoverNode('customer')} onMouseLeave={() => setHoverNode(null)} style={{ cursor: 'pointer' }}>
                    <circle cx="190" cy="78" r="28" fill="url(#g-customer)" />
                    <circle cx="190" cy="78" r="18" fill="#0ea5e9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
                    <text x="190" y="82" textAnchor="middle" fontSize="10" fontWeight="700" fill="white" style={{ fontFamily: 'JetBrains Mono' }}>C·20</text>
                    {hoverNode === 'customer' && <circle cx="190" cy="78" r="22" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.6"><animate attributeName="r" values="22;26;22" dur="1.2s" repeatCount="indefinite" /></circle>}
                  </g>
                  {/* transaction ring */}
                  {[
                    { x: 90, y: 38, label: 'TX', risk: false }, { x: 190, y: 28, label: 'TX', risk: true }, { x: 290, y: 38, label: 'TX', risk: false },
                    { x: 70, y: 148, label: 'TX', risk: false }, { x: 145, y: 172, label: 'TX', risk: true }, { x: 235, y: 172, label: 'TX', risk: false }, { x: 310, y: 148, label: 'TX', risk: true },
                  ].map((n, i) => (
                    <g key={i} onMouseEnter={() => setHoverNode(`tx-${i}`)} onMouseLeave={() => setHoverNode(null)} style={{ cursor: 'pointer' }}>
                      {n.risk && <circle cx={n.x} cy={n.y} r="20" fill="url(#g-risk)" />}
                      <rect x={n.x - 18} y={n.y - 12} width="36" height="24" rx="7" fill={n.risk ? '#fb7185' : '#334155'} stroke={n.risk ? 'rgba(251,113,133,0.6)' : 'rgba(255,255,255,0.08)'} strokeWidth="1" />
                      <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="white">{n.label}</text>
                      {n.risk && <circle cx={n.x + 14} cy={n.y - 10} r="4" fill="#f43f5e" stroke="white" strokeWidth="1"><animate attributeName="opacity" values="1;0.5;1" dur="1.1s" repeatCount="indefinite" /></circle>}
                    </g>
                  ))}
                  {/* payee outer */}
                  {[
                    { x: 52, y: 220, label: 'Rent' }, { x: 128, y: 230, label: 'Swiggy' }, { x: 252, y: 230, label: 'Uber' }, { x: 328, y: 220, label: 'Amazon' },
                  ].map((n, i) => (
                    <g key={i} onMouseEnter={() => setHoverNode(`pay-${i}`)} onMouseLeave={() => setHoverNode(null)} style={{ cursor: 'pointer' }}>
                      <rect x={n.x - 26} y={n.y - 10} width="52" height="20" rx="10" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                      <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="8" fontWeight="600" fill="#cbd5e1">{n.label}</text>
                    </g>
                  ))}
                  {/* hover tooltip */}
                  {hoverNode && (
                    <g>
                      <rect x="118" y="202" width="144" height="22" rx="8" fill="#0d1424" stroke="rgba(255,255,255,0.1)" />
                      <text x="190" y="216" textAnchor="middle" fontSize="8" fill="#e2e8f0" fontWeight="600">
                        {hoverNode === 'customer' ? '20 customers · click to explore' : hoverNode.startsWith('tx') ? 'Transaction · risk-linked' : 'Payee · tap to filter'}
                      </text>
                    </g>
                  )}
                </svg>
                <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                  <span className="inline-flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-sky-400" /> Customer</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded bg-slate-600" /> Transaction</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-white/20 border border-white/20" /> Payee</span>
                  <span className="inline-flex items-center gap-1.5 text-rose-300"><span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse-subtle" /> Risk</span>
                </div>
              </div>
            </div>
            {/* floating badges */}
            <div className="absolute -right-1 top-14 hidden lg:flex flex-col gap-2" style={{ transform: 'translateZ(24px)' }}>
              <span className="px-2.5 py-1.5 rounded-full bg-ink-800/90 border border-white/10 text-[11px] font-mono text-slate-300 backdrop-blur shadow-lg animate-float">R01 · Large Tx</span>
              <span className="px-2.5 py-1.5 rounded-full bg-ink-800/90 border border-white/10 text-[11px] font-mono text-slate-300 backdrop-blur shadow-lg animate-float-slow" style={{ animationDelay: '0.8s' }}>R03 · Odd Hours</span>
            </div>
            <div className="absolute -left-1 bottom-10 hidden lg:block px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-300 backdrop-blur shadow-lg" style={{ transform: 'translateZ(16px)' }}>
              ● Evidence trail
            </div>
          </div>
        </div>
      </div>
      {/* bottom meta */}
      <div className="px-6 py-3 flex flex-wrap items-center gap-3 border-t border-white/[0.04] bg-white/[0.015] text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-sky-400" /> Deterministic rules</span>
        <span className="w-px h-3 bg-white/10" />
        <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-violet-400" /> AI explains only</span>
        <span className="w-px h-3 bg-white/10 hidden sm:inline" />
        <span className="hidden sm:inline">Hover nodes · network is illustrative, data is real</span>
      </div>
    </div>
  )
}
