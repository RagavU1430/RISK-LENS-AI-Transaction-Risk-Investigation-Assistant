import { Fragment } from 'react'

// Words/phrases that signal risk — highlighted so the analyst's eye jumps straight to them.
// Keep this list focused on review language (never "fraud" verdicts).
const DANGER_MAP = {
  // high-severity — rose
  'unusually large': 'rose',
  'significant deviation': 'rose',
  'large transaction': 'rose',
  'high amount': 'rose',
  'high severity': 'rose',
  'high': 'rose',
  'critical': 'rose',
  'exceeded': 'rose',
  'exceeds': 'rose',
  'anomalous': 'rose',
  'anomaly': 'rose',
  // medium/warning — amber
  'deviation': 'amber',
  'outlier': 'amber',
  'spike': 'amber',
  'burst': 'amber',
  'unusual': 'amber',
  'suspicious': 'amber',
  'threshold': 'amber',
  'median': 'amber',
  'baseline': 'sky',
  'flagged': 'amber',
  'triggered': 'sky',
  'requires investigation': 'amber',
  'needs investigation': 'amber',
}

const TONE = {
  rose:  'bg-rose-500/15 text-rose-300 border border-rose-500/25',
  amber: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  sky:   'bg-sky-500/15 text-sky-300 border border-sky-500/25',
}

// Amounts like  ₹12,345  or  ₹12,345.67  or  34095.0  + nearby currency words
const AMOUNT_RE = /₹\s?[\d,]+(?:\.\d+)?|\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s?(?:INR|₹)\b/gi

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PHRASES = Object.keys(DANGER_MAP).sort((a, b) => b.length - a.length)
const WORD_RE = new RegExp(`(${PHRASES.map(escape).join('|')})`, 'gi')

function highlightAmounts(text) {
  if (!text || typeof text !== 'string') return text
  const parts = text.split(AMOUNT_RE)
  const matches = [...text.matchAll(AMOUNT_RE)]
  if (matches.length === 0) return text
  const out = []
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) out.push(parts[i])
    if (i < matches.length) {
      out.push(
        <span key={`amt-${i}`} className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[12px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/25">
          {matches[i][0]}
        </span>
      )
    }
  }
  return out
}

function highlightWords(nodes) {
  // nodes may be string or array (from amount highlighting)
  const flat = Array.isArray(nodes) ? nodes : [nodes]
  return flat.flatMap((node, idx) => {
    if (typeof node !== 'string') return [node]
    const parts = node.split(WORD_RE)
    return parts.map((part, j) => {
      const key = part.toLowerCase()
      const tone = DANGER_MAP[key]
      if (!tone) return part ? <Fragment key={`${idx}-${j}`}>{part}</Fragment> : null
      return (
        <span key={`${idx}-${j}`} className={`inline px-1.5 py-0.5 rounded text-[12px] font-semibold ${TONE[tone]}`}>
          {part}
        </span>
      )
    })
  })
}

export function highlightDanger(text) {
  if (!text || typeof text !== 'string') return text
  // amounts first so they don't get split by word highlighting
  const withAmounts = highlightAmounts(text)
  return highlightWords(withAmounts)
}

export default function DangerText({ children, className = '' }) {
  if (children == null || children === '') return null
  return <span className={className}>{highlightDanger(String(children))}</span>
}
