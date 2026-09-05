import { cx } from '../../lib/format.js'

export function SkeletonLine({ className = '' }) {
  return <div className={cx('relative overflow-hidden rounded-lg bg-white/[0.06] shimmer', className)} />
}

export default function LoadingSkeleton({ rows = 5, className = '' }) {
  return (
    <div className={cx('rounded-2xl border border-white/[0.06] p-6 space-y-4 overflow-hidden relative', className)} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)' }}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent shimmer pointer-events-none" />
      <SkeletonLine className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className="h-12 w-full" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  )
}

export function CardSkeleton({ className = '' }) {
  return (
    <div className={cx('rounded-2xl border border-white/[0.06] p-6 space-y-4 relative overflow-hidden', className)} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))' }}>
      <div className="absolute inset-0 shimmer opacity-30" />
      <SkeletonLine className="h-4 w-1/4" />
      <SkeletonLine className="h-8 w-1/2" />
      <SkeletonLine className="h-3 w-2/3" />
    </div>
  )
}

export function ChartSkeleton({ className = '' }) {
  return (
    <div className={cx('rounded-2xl border border-white/[0.06] p-6 relative overflow-hidden', className)} style={{ background: 'rgba(17,26,46,0.6)', backdropFilter: 'blur(8px)' }}>
      <SkeletonLine className="h-4 w-1/3 mb-6" />
      <SkeletonLine className="h-[200px] w-full rounded-xl" />
    </div>
  )
}
