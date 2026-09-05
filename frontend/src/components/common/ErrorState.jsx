import { AlertOctagon, RotateCcw, ShieldAlert } from 'lucide-react'

export default function ErrorState({ message = 'Unable to load investigation data.', onRetry }) {
  return (
    <div className="relative rounded-2xl border border-rose-500/15 p-8 flex flex-col items-center text-center overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(251,113,133,0.06) 0%, rgba(17,26,46,0.8) 100%)', backdropFilter: 'blur(8px)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
      <span className="relative w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 inline-flex items-center justify-center text-rose-300 shadow shadow-rose-500/10">
        <AlertOctagon size={22} />
      </span>
      <p className="relative mt-4 text-white font-bold text-[15px] tracking-tight">Something went wrong</p>
      <p className="relative mt-2 text-[13px] leading-relaxed text-slate-400 max-w-md">{message}</p>
      <p className="relative mt-2 text-xs text-slate-600 inline-flex items-center gap-1.5"><ShieldAlert size={11} /> Deterministic data remains available elsewhere</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="relative mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[13px] font-bold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all duration-200"
        >
          <RotateCcw size={15} /> Retry
        </button>
      )}
    </div>
  )
}
