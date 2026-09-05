// Shared Recharts tooltip: explicit light-on-dark styling (never inherits
// bar colors), non-interactive wrapper (no hover flicker), clamped to plot.
export default function ChartTip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1424] px-3 py-2 shadow-xl">
      {label !== undefined && label !== '' && (
        <p className="font-mono text-[12px] font-semibold text-slate-100">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="mt-0.5 text-[12px] tabular-nums text-slate-300">
          {entry.name} : {entry.value}
        </p>
      ))}
    </div>
  )
}

export const CHART_TIP_PROPS = {
  wrapperStyle: { outline: 'none', zIndex: 50, pointerEvents: 'none' },
  allowEscapeViewBox: { x: false, y: false },
}

export const BAR_CURSOR = { fill: 'rgba(148, 163, 184, 0.12)' }
