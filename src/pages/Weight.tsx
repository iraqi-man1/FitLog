import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react'
import { useApp } from '../data/context'
import { WeightChart } from '../components/WeightChart'
import { Dialog } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import { Field, inputClass, Panel, SectionHead, Segmented } from '../components/shared'
import { weights, weightChangeSince } from '../lib/stats'
import { addDays, dateLabel, formatNumber, todayKey, weightDisplay, weightInputKg } from '../lib/utils'
import { tr } from '../lib/i18n'

type Range = 'week' | 'month' | '3m' | '6m' | 'year' | 'all'
export function WeightPage({ onDay }: { onDay: (date: string) => void }) {
  const { data, saveDay } = useApp(), s = data.settings, t = (x: string) => tr(x, s.language)
  const [range, setRange] = useState<Range>('3m'), [open, setOpen] = useState(false), [date, setDate] = useState(todayKey()), [value, setValue] = useState('')
  const all = weights(data.days), first = all[0], last = all.at(-1), low = all.length ? Math.min(...all.map(w => w.kg)) : null, high = all.length ? Math.max(...all.map(w => w.kg)) : null
  const start = range === 'all' ? undefined : addDays(todayKey(), ({ week: -7, month: -30, '3m': -90, '6m': -180, year: -365 } as const)[range])
  const fmt = (kg: number | null | undefined) => kg == null ? '—' : `${formatNumber(weightDisplay(kg, s.weightUnit), s.language, 1)} ${s.weightUnit}`
  const delta = (kg: number | null) => kg == null ? '—' : `${kg > 0 ? '+' : ''}${formatNumber(weightDisplay(kg, s.weightUnit), s.language, 1)} ${s.weightUnit}`
  const save = async () => { const n = Number(value); if (!n || n <= 0 || n > 1500) return; await saveDay({ ...(data.days.find(d => d.date === date) ?? { date, gym: null, diet: null }), weightKg: weightInputKg(n, s.weightUnit) }); setOpen(false); setValue('') }
  return <div className="page-enter space-y-6"><SectionHead eyebrow={t('BODY / TREND')} title={t('Weight progress')} description={t('Track change at your own pace. Weigh-ins are always optional.')} action={<Button onClick={() => { setDate(todayKey()); setOpen(true) }}><Plus size={17} />{t('Add weight')}</Button>} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[{ label: t('Current weight'), value: fmt(last?.kg) }, { label: t('Starting weight'), value: fmt(first?.kg) }, { label: t('Lowest'), value: fmt(low) }, { label: t('Highest'), value: fmt(high) }].map(x => <Panel key={x.label} className="p-5"><p className="text-xs text-muted">{x.label}</p><p className="mt-3 text-xl font-bold">{x.value}</p></Panel>)}</div>
    <Panel><div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow mb-2">{t('HISTORY')}</p><h2 className="text-xl font-bold">{t('Weight trend')}</h2></div><Segmented value={range} onChange={setRange} options={[{ value: 'week', label: t('Week') }, { value: 'month', label: t('Month') }, { value: '3m', label: t('3 months') }, { value: '6m', label: t('6 months') }, { value: 'year', label: t('Year') }, { value: 'all', label: t('All') }]} /></div><WeightChart start={start} height={340} /></Panel>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[{ label: t('Total change'), value: first && last ? last.kg - first.kg : null }, { label: t('Last 7 days'), value: weightChangeSince(data.days, 7) }, { label: t('Last 30 days'), value: weightChangeSince(data.days, 30) }, { label: t('Last 90 days'), value: weightChangeSince(data.days, 90) }].map(x => <Panel key={x.label} className="p-5"><p className="text-xs text-muted">{x.label}</p><p className="mt-2 flex items-center gap-1 text-lg font-bold">{x.value != null && (x.value > 0 ? <ArrowUpRight size={16} className="text-danger" /> : <ArrowDownRight size={16} className="text-accent" />)}{delta(x.value)}</p></Panel>)}</div>
    <Panel><SectionHead title={t('Weight history')} />{all.length ? <div className="divide-y divide-line">{[...all].reverse().map(w => <button key={w.date} onClick={() => onDay(w.date)} className="flex w-full justify-between py-3 text-sm hover:text-accent"><span className="text-muted">{dateLabel(w.date, s.language)}</span><strong>{fmt(w.kg)}</strong></button>)}</div> : <p className="py-8 text-center text-sm text-muted">{t('No weights logged yet')}</p>}</Panel>
    <Dialog open={open} onOpenChange={setOpen} title={t('Add weight')}><div className="space-y-4"><Field label={t('Date')}><input className={inputClass} type="date" value={date} onChange={e => setDate(e.target.value)} /></Field><Field label={`${t('Body weight')} · ${s.weightUnit}`}><input autoFocus className={inputClass} type="number" min="1" max="1500" step="0.1" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void save() }} /></Field><Button className="w-full" onClick={() => void save()} disabled={!value}>{t('Save')}</Button></div></Dialog>
  </div>
}
