import CalendarHeatmap from 'react-calendar-heatmap'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../data/context'
import { tr } from '../lib/i18n'
import { addDays, dateLabel, formatNumber, weightDisplay } from '../lib/utils'
import { Button } from './ui/button'
import { Segmented } from './shared'
import type { Settings } from '../data/types'

type Mode = Settings['heatmapMode']
export function ActivityHeatmap({ onDay }: { onDay: (date: string) => void }) {
  const { data, saveSettings } = useApp()
  const s = data.settings, t = (x: string) => tr(x, s.language)
  const mode = s.heatmapMode, year = s.heatmapYear
  const locale = s.language === 'ar' ? 'ar-IQ' : 'en-US'
  const monthLabels = (s.language === 'ar' ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'] : Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2024, i, 1)))) as [string, string, string, string, string, string, string, string, string, string, string, string]
  const weekdayLabels = (s.language === 'ar' ? ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'] : Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 7 + i)))) as [string, string, string, string, string, string, string]
  const byDate = new Map(data.days.map(d => [d.date, d]))
  const start = `${year}-01-01`, end = `${year}-12-31`
  const values: { date: string; count: number }[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const d = byDate.get(date)
    const count = mode === 'gym' ? d?.gym === 'completed' ? 3 : d?.gym === 'rest' ? 1 : d?.gym === 'missed' ? 2 : 0
      : mode === 'diet' ? d?.diet === 'followed' ? 3 : d?.diet === 'cheat_meal' ? 2 : d?.diet ? 1 : 0
      : mode === 'weight' ? d?.weightKg !== undefined ? 3 : 0
      : d?.gym === 'completed' && d?.diet === 'followed' ? 3 : d?.gym === 'completed' || d?.diet === 'followed' ? 2 : d?.gym || d?.diet ? 1 : 0
    values.push({ date, count })
  }
  const set = (updates: Partial<Settings>) => void saveSettings({ ...s, ...updates })
  const tooltip = (date: string) => {
    const d = byDate.get(date)
    if (!d) return `${dateLabel(date, s.language)} · ${t('No log')}`
    const gym = d.gym === 'completed' ? t('Gym completed') : d.gym === 'rest' ? t('Rest day') : d.gym === 'missed' ? t('Missed day') : t('No gym status')
    const diet = d.diet === 'followed' ? t('Diet followed') : d.diet === 'cheat_meal' ? t('Cheat meal') : d.diet === 'cheat_day' ? t('Cheat day') : d.diet === 'missed' ? t('Missed day') : t('No diet status')
    return `${dateLabel(date, s.language)} · ${mode === 'gym' ? gym : mode === 'diet' ? diet : mode === 'weight' ? d.weightKg !== undefined ? `${formatNumber(weightDisplay(d.weightKg, s.weightUnit), s.language, 1)} ${s.weightUnit}` : t('No weight') : `${gym} · ${diet}`}`
  }
  return <div className={`heatmap-${mode}`}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Segmented<Mode> value={mode} onChange={heatmapMode => set({ heatmapMode })} options={[{ value: 'overall', label: t('Overall') }, { value: 'gym', label: t('Gym') }, { value: 'diet', label: t('Diet') }, { value: 'weight', label: t('Weight logging') }]} /><div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="Previous year" onClick={() => set({ heatmapYear: year - 1 })}><ChevronLeft size={16} /></Button><span className="min-w-12 text-center text-sm font-semibold">{formatNumber(year, s.language)}</span><Button variant="ghost" size="icon" aria-label="Next year" onClick={() => set({ heatmapYear: year + 1 })}><ChevronRight size={16} /></Button></div></div>
    <div className="heatmap-scroll"><CalendarHeatmap startDate={start} endDate={end} values={values} monthLabels={monthLabels} weekdayLabels={weekdayLabels} showWeekdayLabels classForValue={v => `color-${v?.count ?? 'empty'}`} onClick={v => { if (v?.date) onDay(v.date) }} titleForValue={v => v?.date ? tooltip(v.date) : ''} /></div>
    <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted"><span className="me-2">{t('Less')}</span>{[0, 1, 2, 3].map(n => <span key={n} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: n === 0 ? 'var(--surface-2)' : `var(--heat-${n})` }} />)}<span className="ms-2">{t('More')}</span></div>
  </div>
}
