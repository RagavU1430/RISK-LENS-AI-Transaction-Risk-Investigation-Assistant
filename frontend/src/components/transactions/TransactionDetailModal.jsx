import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Shield, ExternalLink } from 'lucide-react'
import { getTransaction, getEvidence } from '../../lib/api.js'
import { formatAmount, formatDateTime } from '../../lib/format.js'
import SeverityBadge from '../common/SeverityBadge.jsx'
import DangerText from '../common/DangerHighlight.jsx'

function Row({ label, children, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-[13px] text-slate-200 text-right ${mono ? 'font-mono' : ''}`}>{children}</span>
    </div>
  )
}

export default function TransactionDetailModal({ transactionId, onClose }) {
  const [tx, setTx] = useState(null)
  const [state, setState] = useState('loading')
  const [rulePopup, setRulePopup] = useState(null)
  const [ruleDetail, setRuleDetail] = useState(null)

  useEffect(() => {
    if (!transactionId) return
    setState('loading')
    getTransaction(transactionId).then((d) => { setTx(d); setState('done') }).catch(() => setState('error'))
  }, [transactionId])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (rulePopup) setRulePopup(null)
        else onClose?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, rulePopup])

  async function openRule(rule) {
    setRulePopup(rule)
    setRuleDetail(null)
    try {
      const ev = await getEvidence({ finding_id: rule.finding_id })
      const pkg = (ev.evidence_packages ?? [])[0] || null
      setRuleDetail(pkg)
    } catch {
      setRuleDetail(null)
    }
  }

  if (!transactionId) return null
  const modal = (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label="Transaction detail">
      <div className="fixed inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg my-8 max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-ink-800 shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)' }}>
        <div className="shrink-0 flex items-start justify-between gap-3 p-6 pb-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold">Transaction</p>
            <h3 className="mt-1 font-mono text-white font-semibold">{transactionId}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-6 pt-4">
        {state === 'loading' && (
          <div className="space-y-3 py-4">
            <div className="h-4 w-1/3 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="h-20 rounded-xl bg-white/[0.04] border border-white/5 animate-pulse" />
            <p className="text-xs text-slate-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" /> Loading transaction…</p>
          </div>
        )}
        {state === 'error' && <p className="text-[13px] text-rose-300 bg-rose-500/5 border border-rose-500/15 rounded-xl p-3">Unable to load transaction data. Please try again.</p>}
        {state === 'done' && tx && (
          <>
            <Row label="Customer" mono>{tx.customer_id}</Row>
            <Row label="Timestamp" mono>{formatDateTime(tx.timestamp)}</Row>
            <Row label="Description">{tx.description}</Row>
            <Row label="Payee">{tx.payee}</Row>
            <Row label="Amount" mono>{formatAmount(tx.amount)}</Row>
            <Row label="Channel" mono>{tx.channel}</Row>
            <Row label="Type" mono>{tx.transaction_type}</Row>
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-2">Triggered rules</p>
              {(tx.rule_details ?? []).length === 0 && (
                <span className="text-[13px] text-slate-400">Normal — no rule triggered for this transaction.</span>
              )}
              <ul className="space-y-2">
                {(tx.rule_details ?? []).map((r) => (
                  <li key={r.finding_id} className="group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-sky-500/20 p-3 flex items-center gap-3 cursor-pointer transition-colors" onClick={() => openRule(r)}>
                    <SeverityBadge severity={r.severity} />
                    <span className="font-mono text-xs font-bold text-slate-200">{r.rule_id}</span>
                    <span className="text-xs text-slate-500 hidden sm:inline">{r.finding_id}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-mono text-sky-400 group-hover:text-sky-300">{r.finding_id} <ExternalLink size={11} /></span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
  )
  const ruleModal = rulePopup && (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label="Rule detail">
      <div className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setRulePopup(null)} />
      <div className="relative w-full max-w-md my-8 max-h-[80vh] flex flex-col rounded-2xl border border-white/10 bg-ink-800 shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out]">
        <div className="shrink-0 flex items-start justify-between gap-3 p-6 pb-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300"><Shield size={16} /></span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">Rule Detail</p>
              <h3 className="font-mono text-white font-bold text-[15px]">{rulePopup.rule_id} <span className="font-sans text-slate-500 font-normal text-sm">· {rulePopup.finding_id}</span></h3>
            </div>
          </div>
          <button type="button" onClick={() => setRulePopup(null)} aria-label="Close" className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]"><X size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-6 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <SeverityBadge severity={rulePopup.severity} />
            <span className="text-xs text-slate-500">Triggered by</span>
            <span className="font-mono text-xs font-bold text-sky-300">{transactionId}</span>
          </div>
          {ruleDetail ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
                <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 mb-1">Evidence</p>
                <p className="text-[13px] text-slate-300 leading-relaxed"><DangerText>{ruleDetail?.baseline_comparison ? `${ruleDetail.baseline_comparison.observed != null ? `Observed ${ruleDetail.baseline_comparison.observed}` : ''} vs baseline ${ruleDetail.baseline_comparison.baseline ?? ruleDetail.baseline_comparison.baseline_mean ?? ''}` : 'Evidence from deterministic engine.'}</DangerText></p>
                {(ruleDetail.primary_transactions ?? []).slice(0, 2).map((t) => (
                  <p key={t.transaction_id} className="mt-2 font-mono text-xs text-slate-400 bg-ink-900/50 border border-white/5 rounded-lg px-2.5 py-2">{t.transaction_id} · {formatAmount(t.amount)} · {t.payee}</p>
                ))}
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3.5">
                <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 mb-1">Why triggered</p>
                <p className="text-[13px] text-slate-300 leading-relaxed"><DangerText>{ruleDetail.calculation?.formula ? `${ruleDetail.calculation.formula} = ${ruleDetail.calculation.result} (threshold ${ruleDetail.calculation.threshold})` : 'Deterministic rule threshold exceeded.'}</DangerText></p>
              </div>
            </div>
          ) : (
            <div className="h-20 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
          )}
          <a href={`/investigations/INV-${rulePopup.finding_id}`} className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[13px] font-bold shadow-lg shadow-sky-500/20 transition-colors">
            Open full investigation <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(<>{modal}{ruleModal}</>, document.body) : <>{modal}{ruleModal}</>
}
