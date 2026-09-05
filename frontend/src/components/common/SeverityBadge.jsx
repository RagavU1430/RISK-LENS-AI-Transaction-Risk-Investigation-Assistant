import { AlertTriangle, ArrowUpCircle, MinusCircle, ShieldAlert } from 'lucide-react'
import { cx } from '../../lib/format.js'

const STYLES = {
  HIGH: {
    cls: 'text-rose-300 bg-rose-500/10 border-rose-500/25 shadow shadow-rose-500/10',
    Icon: AlertTriangle,
  },
  MEDIUM: {
    cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25 shadow shadow-amber-500/10',
    Icon: ShieldAlert,
  },
  LOW: {
    cls: 'text-sky-300 bg-sky-500/10 border-sky-500/25 shadow shadow-sky-500/10',
    Icon: MinusCircle,
  },
}

export default function SeverityBadge({ severity = 'LOW', className = '' }) {
  const key = String(severity ?? 'LOW').toUpperCase()
  const { cls, Icon } = STYLES[key] ?? STYLES.LOW
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-wide backdrop-blur transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
        cls, className
      )}
    >
      <Icon size={12} strokeWidth={2.2} aria-hidden />
      {key}
      <span className="w-1 h-1 rounded-full bg-current opacity-60 ml-0.5" aria-hidden />
    </span>
  )
}
