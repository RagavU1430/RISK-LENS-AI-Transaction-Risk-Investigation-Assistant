import { Database, Gauge, Zap, FileSearch, Layers, Brain } from 'lucide-react'

const STAGES = [
  { label: 'Transactions', icon: Database },
  { label: 'Behavior Baseline', icon: Gauge },
  { label: 'Risk Rules', icon: Zap },
  { label: 'Evidence', icon: Layers },
  { label: 'Investigation', icon: FileSearch },
  { label: 'AI Explanation', icon: Brain },
]

export default function Pipeline() {
  return (
    <div className="rounded-xl bg-ink-800 border border-white/[0.06] p-5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold mb-4">
        Detection Pipeline
      </p>
      <ol className="flex flex-wrap items-center gap-y-3">
        {STAGES.map(({ label, icon: Icon }, i) => (
          <li key={label} className="flex items-center">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[12.5px] text-slate-300 font-medium">
              <Icon size={15} className="text-sky-400" />
              {label}
            </span>
            {i < STAGES.length - 1 && (
              <span className="mx-1.5 text-slate-600 font-mono" aria-hidden>→</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
