export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function formatAmount(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return inr.format(n)
}

export function formatNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-IN')
}

export function formatDateTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 10)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const SEVERITY_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 }

export function severityRank(sev) {
  return SEVERITY_RANK[String(sev ?? '').toUpperCase()] ?? 0
}

export function maxSeverity(severities) {
  let best = 'LOW'
  for (const s of severities ?? []) {
    if (severityRank(s) >= severityRank(best)) best = String(s).toUpperCase()
  }
  return best
}

// Display-only workflow label derived from severity (not a risk decision).
export function statusForSeverity(sev) {
  switch (String(sev ?? '').toUpperCase()) {
    case 'HIGH': return 'Needs Investigation'
    case 'MEDIUM': return 'Under Review'
    default: return 'Monitoring'
  }
}

export function severityTone(sev) {
  switch (String(sev ?? '').toUpperCase()) {
    case 'HIGH': return 'rose'
    case 'MEDIUM': return 'amber'
    default: return 'sky'
  }
}
