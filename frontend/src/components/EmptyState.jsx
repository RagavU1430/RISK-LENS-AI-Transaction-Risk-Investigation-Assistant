import { Link } from 'react-router-dom'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo = '/investigations',
}) {
  return (
    <div className="relative rounded-2xl border border-dashed border-white/[0.08] overflow-hidden px-8 py-14 flex flex-col items-center text-center group" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))', backdropFilter: 'blur(8px)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.02] via-transparent to-violet-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 grid-pattern opacity-[0.015] pointer-events-none" />
      {Icon && (
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] inline-flex items-center justify-center text-slate-400 shadow-lg group-hover:scale-105 group-hover:border-white/10 transition-all duration-300">
          <Icon size={24} strokeWidth={1.5} />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
      <h3 className="relative mt-5 text-white font-bold text-[16px] tracking-tight">{title}</h3>
      <p className="relative mt-2 max-w-md text-[13.5px] leading-relaxed text-slate-500">{description}</p>
      {actionLabel && (
        <Link
          to={actionTo}
          className="relative mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[13.5px] font-semibold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all duration-200"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
