const TONES = {
  ok: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20 shadow shadow-emerald-500/10',
  info: 'text-sky-300 bg-sky-500/10 border-sky-500/20 shadow shadow-sky-500/10',
  warn: 'text-amber-300 bg-amber-500/10 border-amber-500/20 shadow shadow-amber-500/10',
  muted: 'text-slate-400 bg-white/[0.04] border-white/[0.08] backdrop-blur',
}

export default function StatusBadge({ children, tone = 'muted', dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur transition-all duration-200 hover:scale-[1.02] ${TONES[tone]}`}
    >
      {dot && <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-current animate-ping opacity-40" /><span className="relative w-1.5 h-1.5 rounded-full bg-current" /></span>}
      {children}
    </span>
  )
}
