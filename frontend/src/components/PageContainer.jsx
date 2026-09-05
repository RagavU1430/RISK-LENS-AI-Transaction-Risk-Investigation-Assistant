export default function PageContainer({ eyebrow, title, description, actions, children }) {
  return (
    <div className="max-w-[1160px] mx-auto w-full animate-[fadeIn_0.4s_ease-out]">
      {(eyebrow || title) && (
        <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div className="min-w-0">
            {eyebrow && (
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: '#38bdf8' }}>
                <span className="w-6 h-px bg-sky-400/60" />
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-2 text-[22px] sm:text-2xl font-extrabold text-white tracking-tight leading-none">
                {title}
              </h2>
            )}
            {description && <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500 max-w-2xl">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className="animate-[slideUp_0.4s_ease-out_0.08s_both]">{children}</div>
    </div>
  )
}
