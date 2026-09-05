import { useEffect, useRef, useState } from 'react'
import { Network, Layers, User, CreditCard, Store } from 'lucide-react'

// Lightweight 3D investigation graph — customer → transactions → payees.
// Pure SVG + CSS 3D, interactive, no extra deps. Depth via perspective and floating layers.
export default function InvestigationNetwork3D({ investigation, onSelectTransaction }) {
  const wrapRef = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -5, y: ((e.clientX - r.left) / r.width - 0.5) * 7 })
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

  const findings = investigation.findings ?? []
  const primaries = (investigation.evidence_packages ?? []).flatMap((p) => p.primary_transactions ?? [])
  const uniqueTx = [...new Map(primaries.map((t) => [t.transaction_id, t])).values()].slice(0, 6)
  const payees = [...new Set(uniqueTx.map((t) => t.payee))].slice(0, 4)
  const rules = [...new Set(findings.map((f) => f.rule_id))]

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07]"
      style={{
        background: 'linear-gradient(135deg, rgba(17,26,46,0.9) 0%, rgba(13,20,36,0.95) 100%)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        perspective: '1000px',
      }}
    >
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.35), transparent 70%)' }} />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)' }} />
      <div className="absolute inset-0 grid-pattern opacity-[0.025] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-300"><Network size={14} /></span>
            Transaction Network
            <span className="hidden sm:inline-flex text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-white/[0.04] border border-white/5 text-slate-500">3D · interactive</span>
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            {rules.map((r) => (
              <span key={r} className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">{r}</span>
            ))}
          </div>
        </div>

        <div
          className="relative rounded-xl border border-white/[0.06] overflow-hidden p-4"
          style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(8px)', transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          <svg viewBox="0 0 520 220" className="w-full h-auto relative" role="img" aria-label="Investigation transaction network">
            <defs>
              <radialGradient id="ig-customer"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" /><stop offset="100%" stopColor="#38bdf8" stopOpacity="0" /></radialGradient>
              <radialGradient id="ig-risk"><stop offset="0%" stopColor="#fb7185" stopOpacity="0.4" /><stop offset="100%" stopColor="#fb7185" stopOpacity="0" /></radialGradient>
            </defs>
            {/* customer */}
            <g onMouseEnter={() => setHover('customer')} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
              <circle cx="90" cy="110" r="32" fill="url(#ig-customer)" />
              <circle cx="90" cy="110" r="22" fill="#0ea5e9" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
              <foreignObject x="78" y="98" width="24" height="24"><div className="w-6 h-6 flex items-center justify-center text-white"><User size={14} /></div></foreignObject>
              <text x="90" y="150" textAnchor="middle" fontSize="8" fontWeight="700" fill="#e2e8f0" style={{ fontFamily: 'JetBrains Mono' }}>{investigation.customer_id}</text>
              <text x="90" y="160" textAnchor="middle" fontSize="7" fill="#64748b">Customer</text>
            </g>
            {/* transactions */}
            {uniqueTx.map((tx, i) => {
              const x = 210 + (i % 3) * 70
              const y = 40 + Math.floor(i / 3) * 90
              const isRisk = findings.some((f) => (f.transaction_ids ?? []).includes(tx.transaction_id))
              return (
                <g key={tx.transaction_id} onMouseEnter={() => setHover(tx.transaction_id)} onMouseLeave={() => setHover(null)} onClick={(e) => { e.stopPropagation(); onSelectTransaction?.(tx.transaction_id) }} style={{ cursor: 'pointer' }}>
                  <line x1="90" y1="110" x2={x} y2={y} stroke={isRisk ? 'rgba(251,113,133,0.5)' : 'rgba(148,163,184,0.2)'} strokeWidth={isRisk ? 1.5 : 1} strokeDasharray={isRisk ? '0' : '4 4'} />
                  {isRisk && <line x1="90" y1="110" x2={x} y2={y} stroke="rgba(251,113,133,0.8)" strokeWidth="1" strokeDasharray="6 6" opacity="0.6"><animate attributeName="stroke-dashoffset" from="12" to="0" dur="1.2s" repeatCount="indefinite" /></line>}
                  {isRisk && <circle cx={x} cy={y} r="22" fill="url(#ig-risk)" />}
                  <rect x={x - 24} y={y - 14} width="48" height="28" rx="8" fill={isRisk ? '#e11d48' : '#1e293b'} stroke={isRisk ? 'rgba(251,113,133,0.6)' : 'rgba(255,255,255,0.08)'} strokeWidth="1" />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="7" fontWeight="700" fill="white">{tx.transaction_id.slice(0, 6)}</text>
                  {isRisk && <circle cx={x + 18} cy={y - 12} r="4.5" fill="#f43f5e" stroke="white" strokeWidth="1"><animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" /></circle>}
                </g>
              )
            })}
            {/* payees */}
            {payees.map((payee, i) => {
              const x = 410
              const y = 45 + i * 48
              const txForPayee = uniqueTx.find((t) => t.payee === payee)
              const txX = txForPayee ? 210 + (uniqueTx.indexOf(txForPayee) % 3) * 70 : 280
              const txY = txForPayee ? 40 + Math.floor(uniqueTx.indexOf(txForPayee) / 3) * 90 : 110
              return (
                <g key={payee} onMouseEnter={() => setHover(payee)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                  <line x1={txX} y1={txY} x2={x} y2={y} stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="3 4" />
                  <rect x={x - 36} y={y - 12} width="72" height="24" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <text x={x} y={y + 3.5} textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#cbd5e1">{payee.slice(0, 10)}</text>
                </g>
              )
            })}
            {/* hover tooltip */}
            {hover && (
              <g>
                <rect x="160" y="190" width="200" height="20" rx="8" fill="#0d1424" stroke="rgba(255,255,255,0.1)" />
                <text x="260" y="203" textAnchor="middle" fontSize="7.5" fill="#e2e8f0" fontWeight="600">
                  {hover === 'customer' ? `${investigation.customer_id} · click to filter` : hover.startsWith('TX') ? `${hover} · click for detail` : `${hover} · payee`}
                </text>
              </g>
            )}
          </svg>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-mono text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400" /> Customer</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded bg-slate-600" /> Transaction</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/20 border border-white/20" /> Payee</span>
            <span className="inline-flex items-center gap-1.5 text-rose-300"><span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse-subtle" /> Risk-linked</span>
            <span className="ml-auto hidden sm:inline text-slate-600">Hover · click transaction</span>
          </div>
        </div>

        {/* floating meta */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
            <p className="font-mono text-sm font-bold text-white">{findings.length}</p>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Rules</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
            <p className="font-mono text-sm font-bold text-white">{uniqueTx.length}</p>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Transactions</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
            <p className="font-mono text-sm font-bold text-sky-300">{payees.length}</p>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Payees</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-white/[0.015] border-t border-white/[0.04] flex items-center gap-2 text-[11px] text-slate-500">
        <Layers size={12} className="text-sky-400" /> Depth layers · hover to inspect · click to trace
        <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-300 text-[10px] font-medium">Live · deterministic</span>
      </div>
    </div>
  )
}
