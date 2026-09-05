import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, Loader2, MessageCircle, Send, X, Sparkles, Shield, Copy, Check, Zap, Database, Search } from 'lucide-react'
import { sendChatMessage } from '../../lib/api.js'

const QUICK_PROMPTS = [
  { label: 'What is RISK LENS AI?', icon: Sparkles },
  { label: 'Explain rule R01', icon: Shield },
  { label: 'Which investigation should I demo?', icon: Search },
  { label: 'How do I trace evidence to a transaction?', icon: Database },
]

function investigationFromPath(pathname) {
  const m = pathname.match(/^\/investigations\/(INV-[A-Za-z0-9-]+)/)
  return m ? m[1].toUpperCase() : null
}

const STATUS_COPY = {
  unavailable: 'AI chat unavailable. All deterministic pages remain available.',
  error: 'Unable to generate a reply. Please try again.',
  grounding_failed: 'Reply failed evidence validation — the model referenced data not in this site.',
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur">
      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      <span className="ml-1 text-xs font-medium text-slate-500">Thinking</span>
      <span className="inline-flex gap-1">
        <span className="w-1 h-1 rounded-full bg-slate-600 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 rounded-full bg-slate-600 animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-1 h-1 rounded-full bg-slate-600 animate-pulse" style={{ animationDelay: '400ms' }} />
      </span>
    </span>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your RiskLens analyst copilot — grounded only in this site\'s data. Ask about the 8,966 transactions, rules R01–R05, any investigation, or how to run the perfect demo.' },
  ])
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(null)
  const { pathname } = useLocation()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, open, busy])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  async function send(text) {
    const message = (text ?? input).trim()
    if (!message || busy) return
    const next = [...messages, { role: 'user', content: message }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const data = await sendChatMessage(
        message,
        next.filter((m) => m.role === 'user' || m.role === 'assistant').slice(0, -1),
        investigationFromPath(pathname)
      )
      setMessages((ms) => [...ms, data.status === 'complete'
        ? { role: 'assistant', content: data.reply, grounded: true }
        : { role: 'assistant', content: STATUS_COPY[data.status] ?? STATUS_COPY.error, notice: true }])
    } catch {
      setMessages((ms) => [...ms, { role: 'assistant', content: STATUS_COPY.error, notice: true }])
    } finally {
      setBusy(false)
    }
  }

  async function copy(text, idx) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(idx)
      setTimeout(() => setCopied(null), 1400)
    } catch {}
  }

  const groundedId = investigationFromPath(pathname)

  return (
    <>
      {/* Floating trigger — premium 3D */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant chat' : 'Open assistant chat'}
        className="fixed bottom-5 right-5 z-50 group w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white inline-flex items-center justify-center shadow-xl shadow-sky-500/25 hover:shadow-sky-500/30 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300"
        style={{ boxShadow: '0 12px 32px rgba(56,189,248,0.25), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow shadow-emerald-400/50 hidden group-[.is-open]:block" />
        {open ? <X size={20} className="relative" /> : <MessageCircle size={20} className="relative group-hover:rotate-3 transition-transform" />}
        {!open && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-ink-900 shadow animate-pulse-subtle" />}
      </button>

      {open && (
        <div className="fixed bottom-[84px] right-5 z-50 w-[min(400px,calc(100vw-32px))] h-[min(560px,calc(100vh-110px))] flex flex-col rounded-[20px] border border-white/10 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]" role="dialog" aria-modal="false" aria-label="RiskLens assistant chat" style={{ background: 'linear-gradient(180deg, rgba(13,20,36,0.98) 0%, rgba(7,12,22,0.98) 100%)', backdropFilter: 'blur(20px) saturate(1.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          {/* Header — layered depth */}
          <div className="relative px-5 py-4 border-b border-white/[0.06] overflow-hidden shrink-0" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(139,92,246,0.06) 100%)' }}>
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.5), transparent 70%)' }} />
            <div className="absolute inset-0 grid-pattern opacity-[0.02] pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="relative flex items-start gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
                <Bot size={18} className="text-white" />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-ink-850 shadow flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse-subtle" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-bold text-[14px] tracking-tight flex items-center gap-2">
                  RiskLens Assistant
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-[10px] font-bold tracking-widest uppercase text-emerald-300">Live</span>
                </h3>
                <p className="text-xs text-slate-400 leading-none mt-0.5">Grounded in site data · <span className="text-violet-300 font-medium">AI explains, rules decide</span></p>
                {groundedId && <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/15 text-sky-300">⛓ Grounded in {groundedId}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
            {/* pipeline hint */}
            <div className="relative mt-3 flex items-center gap-1.5 text-[10px] font-mono text-slate-600 overflow-x-auto">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] border border-white/5 whitespace-nowrap"><Database size={10} className="text-slate-500" /> Transactions</span>
              <span className="text-slate-700">→</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] border border-white/5 whitespace-nowrap">Rules R01–R05</span>
              <span className="text-slate-700">→</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/15 text-violet-300 whitespace-nowrap"><Sparkles size={10} /> AI</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <span className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${m.notice ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-violet-500/10 border-violet-500/20 text-violet-300'}`}>
                    <Bot size={13} />
                  </span>
                )}
                <div className={`group/message relative max-w-[82%] ${m.role === 'user' ? 'order-first' : ''}`}>
                  <p className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm transition-all duration-200 ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white border border-sky-400/20 shadow-sky-500/10 rounded-br-md'
                      : m.notice
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-bl-md'
                        : 'bg-white/[0.04] border border-white/[0.07] text-slate-200 backdrop-blur rounded-bl-md hover:bg-white/[0.06] hover:border-white/10'
                  }`}>
                    {m.content}
                  </p>
                  {m.role === 'assistant' && !m.notice && (
                    <button type="button" onClick={() => copy(m.content, i)} aria-label="Copy message" className="absolute -right-7 top-1 w-6 h-6 rounded-lg bg-white/[0.04] border border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] hidden group-hover/message:flex items-center justify-center transition-colors">
                      {copied === i ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  )}
                  <p className={`mt-1 text-[10px] font-mono ${m.role === 'user' ? 'text-right text-slate-600' : 'text-slate-600'}`}>{m.role === 'user' ? 'You' : m.grounded ? 'Grounded · deterministic' : 'Assistant'} · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-2.5 justify-start">
                <span className="w-7 h-7 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300"><Bot size={13} /></span>
                <TypingDots />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts — premium chips */}
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => send(label)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-sky-500/10 hover:border-sky-500/20 hover:text-sky-300 text-slate-400 disabled:opacity-40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Icon size={11} className="text-slate-500" />
                {label}
              </button>
            ))}
          </div>

          {/* Composer — glass, depth */}
          <form className="p-3 border-t border-white/[0.06] bg-white/[0.015] backdrop-blur flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send() }}>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the data, rules, demo…"
                aria-label="Chat message"
                maxLength={2000}
                className="w-full pl-3.5 pr-3 py-3 rounded-xl bg-ink-900/80 border border-white/[0.08] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/30 focus:bg-ink-900 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.08)] transition-all"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-white/[0.04] border border-white/5 px-1.5 py-1 rounded-lg">↵</span>
            </div>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 text-white inline-flex items-center justify-center shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
