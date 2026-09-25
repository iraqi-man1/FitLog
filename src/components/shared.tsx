import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export function SectionHead({ eyebrow, title, action, description }: { eyebrow?: string; title: string; action?: ReactNode; description?: string }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h2 className="text-[1.42rem] font-bold tracking-tight sm:text-[1.7rem]">{title}</h2>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>{action}</div>
}
export function Panel({ children, className }: { children: ReactNode; className?: string }) { return <div className={cn('rounded-[22px] border border-line bg-surface p-5 sm:p-6', className)}>{children}</div> }
export function Empty({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) { return <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-line p-6 text-center"><p className="font-semibold">{title}</p>{detail && <p className="mt-1 max-w-sm text-sm text-muted">{detail}</p>}{action && <div className="mt-4">{action}</div>}</div> }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-muted">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}</label> }
export const inputClass = 'h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent'
export const textareaClass = `${inputClass} min-h-24 resize-y py-3`
export function Segmented<T extends string>({ options, value, onChange, className }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; className?: string }) { return <div className={cn('inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1', className)}>{options.map(option => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={cn('rounded-lg px-3 py-2 text-xs font-semibold transition-colors', option.value === value ? 'bg-surface-3 text-foreground shadow-sm' : 'text-muted hover:text-foreground')}>{option.label}</button>)}</div> }
export function ProgressBar({ value }: { value: number }) { return <div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div> }
