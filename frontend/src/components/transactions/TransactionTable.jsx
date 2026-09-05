import { formatAmount, formatDateTime } from '../../lib/format.js'

function amountTone(t) {
  if ((t.triggered_rules ?? []).length > 0) return 'text-rose-300'
  const amt = Number(t.amount)
  if (amt >= 50000) return 'text-rose-300'
  if (amt >= 15000) return 'text-amber-300'
  return 'text-slate-200'
}

export default function TransactionTable({ items, onSelect }) {
  return (
    <div className="rounded-xl bg-ink-800 border border-white/[0.06] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[880px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.1em] text-slate-500 border-b border-white/[0.06]">
              <th className="py-3 px-4 font-semibold">Transaction</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Timestamp</th>
              <th className="py-3 px-4 font-semibold">Payee</th>
              <th className="py-3 px-4 font-semibold text-right">Amount</th>
              <th className="py-3 px-4 font-semibold">Channel</th>
              <th className="py-3 px-4 font-semibold">Type</th>
              <th className="py-3 px-4 font-semibold">Risk</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr
                key={t.transaction_id}
                onClick={() => onSelect?.(t.transaction_id)}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] cursor-pointer"
              >
                <td className="py-2.5 px-4 font-mono text-sky-300 text-xs">{t.transaction_id}</td>
                <td className="py-2.5 px-4 font-mono text-xs text-slate-400">{t.customer_id}</td>
                <td className="py-2.5 px-4 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(t.timestamp)}</td>
                <td className="py-2.5 px-4 text-slate-300">{t.payee}</td>
                <td className={`py-2.5 px-4 text-right font-mono font-semibold ${amountTone(t)}`}>{formatAmount(t.amount)}</td>
                <td className="py-2.5 px-4 font-mono text-xs text-slate-400">{t.channel}</td>
                <td className="py-2.5 px-4 font-mono text-xs text-slate-400">{t.transaction_type}</td>
                <td className="py-2.5 px-4">
                  {(t.triggered_rules ?? []).length > 0 ? (
                    <span className="font-mono text-[11px] font-semibold text-rose-300 border border-rose-500/30 bg-rose-500/10 rounded px-1.5 py-0.5">
                      {t.triggered_rules.join(' + ')}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
