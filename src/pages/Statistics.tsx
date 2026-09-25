import { useApp } from '../data/context'
import { Panel, SectionHead } from '../components/shared'
import { adherence, consistency, consistencyStreak, dietStreak, gymStreak, monthConsistency, monthEndKey, monthStartKey, periodSummary, weekStartKey, weights } from '../lib/stats'
import { addDays, dateLabel, formatNumber, parseDate, todayKey, weightDisplay } from '../lib/utils'
import { tr } from '../lib/i18n'

export function StatisticsPage() {
  const { data } = useApp()
  const s = data.settings, t = (x: string) => tr(x, s.language), today = todayKey()
  const gymDays = data.days.filter(d => d.gym === 'completed')
  const loggedDays = data.days.filter(d => d.gym !== null || d.diet !== null)
  const months = monthConsistency(data.days).filter(m => loggedDays.filter(d => d.date.startsWith(m.month)).length >= 3).sort((a, b) => b.value - a.value)
  const allWeights = weights(data.days)
  const firstLogged = [...data.days].sort((a, b) => a.date.localeCompare(b.date))[0]?.date
  const elapsedWeeks = firstLogged ? Math.max(1, (parseDate(today).getTime() - parseDate(firstLogged).getTime()) / 604_800_000) : 1
  const elapsedMonths = allWeights.length > 1 ? Math.max(1, (parseDate(allWeights.at(-1)!.date).getTime() - parseDate(allWeights[0].date).getTime()) / 2_629_746_000) : 1
  const sleepGym = data.days.filter(d => d.sleepHours !== undefined && d.gym === 'completed')
  const sleepOther = data.days.filter(d => d.sleepHours !== undefined && d.gym !== 'completed')
  const avgSleep = (items: typeof sleepGym) => items.length ? items.reduce((sum, d) => sum + d.sleepHours!, 0) / items.length : null
  const currentMonth = monthStartKey(today), previousMonth = monthStartKey(addDays(currentMonth, -1))
  const current = periodSummary(data, currentMonth, today), previous = periodSummary(data, previousMonth, monthEndKey(previousMonth))
  const thisWeekStart = weekStartKey(today, s.weekStart), lastWeekStart = addDays(thisWeekStart, -7)
  const thisWeek = periodSummary(data, thisWeekStart, today), lastWeek = periodSummary(data, lastWeekStart, addDays(thisWeekStart, -1))
  const n = (value: number, digits = 0) => formatNumber(value, s.language, digits)
  const monthLabel = (key?: string) => key ? dateLabel(`${key}-01`, s.language, { month: 'long', year: 'numeric' }) : '—'
  const unitValue = (value: number | null, kind: 'count' | 'percent' | 'weight' | 'volume') => value === null ? '—' : kind === 'percent' ? `${n(value)}%` : kind === 'count' ? n(value) : `${n(weightDisplay(value, s.weightUnit), 1)} ${s.weightUnit}`
  const rows: { label: string; a: number | null; b: number | null; kind: 'count' | 'percent' | 'weight' | 'volume' }[] = [
    { label: t('Gym sessions'), a: current.gym, b: previous.gym, kind: 'count' },
    { label: t('Diet adherence'), a: current.diet, b: previous.diet, kind: 'percent' },
    { label: t('Average weight'), a: current.averageWeight, b: previous.averageWeight, kind: 'weight' },
    { label: t('Weight change'), a: current.weightChange, b: previous.weightChange, kind: 'weight' },
    { label: t('Training volume'), a: current.volume, b: previous.volume, kind: 'volume' },
  ]
  const metric = (label: string, value: string) => <Panel key={label} className="p-5"><p className="text-xs text-muted">{label}</p><p className="mt-3 text-xl font-bold">{value}</p></Panel>
  return <div className="page-enter space-y-6">
    <SectionHead eyebrow={t('LOCAL INSIGHTS')} title={t('Your numbers')} description={t('Descriptive statistics from your own logs.')} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metric(t('Average gym sessions / week'), n(gymDays.length / elapsedWeeks, 1))}
      {metric(t('Diet adherence'), `${n(adherence(data.days))}%`)}
      {metric(t('Total active days'), n(data.days.filter(d => d.gym === 'completed' || d.diet === 'followed').length))}
      {metric(t('Consistency'), `${n(consistency(data.days))}%`)}
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel><SectionHead title={t('Streaks & patterns')} /><div className="space-y-4">{[
        [t('Current gym streak'), gymStreak(data.days).current], [t('Longest gym streak'), gymStreak(data.days).longest],
        [t('Current diet streak'), dietStreak(data.days).current], [t('Longest diet streak'), dietStreak(data.days).longest],
        [t('Longest consistency streak'), consistencyStreak(data.days).longest],
      ].map(([label, value]) => <div key={label} className="flex justify-between border-b border-line pb-3 text-sm"><span className="text-muted">{label}</span><strong>{n(Number(value))} {t('days')}</strong></div>)}</div></Panel>
      <Panel><SectionHead title={t('Observations')} /><div className="space-y-4">{[
        [t('Most consistent month'), monthLabel(months[0]?.month)], [t('Least consistent month'), monthLabel(months.at(-1)?.month)],
        [t('Average weight change / month'), allWeights.length > 1 ? unitValue((allWeights.at(-1)!.kg - allWeights[0].kg) / elapsedMonths, 'weight') : '—'],
        [t('Average sleep on gym days'), avgSleep(sleepGym) === null ? '—' : `${n(avgSleep(sleepGym)!, 1)} ${t('h')}`],
        [t('Average sleep on other days'), avgSleep(sleepOther) === null ? '—' : `${n(avgSleep(sleepOther)!, 1)} ${t('h')}`],
      ].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-line pb-3 text-sm"><span className="text-muted">{label}</span><strong className="text-end">{value}</strong></div>)}</div></Panel>
    </div>
    <Panel><SectionHead title={t('Weekly & monthly summaries')} description={t('The figures describe your recorded days only.')} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      { label: t('This week'), summary: thisWeek }, { label: t('Last week'), summary: lastWeek },
      { label: t('This month'), summary: current }, { label: t('Last month'), summary: previous },
    ].map(({ label, summary }) => <div key={label} className="rounded-xl border border-line bg-surface-2 p-4"><p className="mb-3 text-xs font-bold text-accent">{label}</p><p className="text-sm"><strong>{n(summary.gym)}</strong> {t('Gym sessions').toLowerCase()}</p><p className="mt-1 text-xs text-muted">{n(summary.days)} {t('Logged days').toLowerCase()} · {n(summary.diet)}% {t('Diet adherence').toLowerCase()}</p></div>)}</div></Panel>
    <Panel><SectionHead title={t('Compare periods')} description={t('This month vs last month')} /><div className="overflow-x-auto"><table className="w-full min-w-130 text-sm"><thead><tr className="border-b border-line text-xs text-muted"><th className="py-3 text-start font-medium">{t('Metric')}</th><th className="py-3 text-end font-medium">{t('This month')}</th><th className="py-3 text-end font-medium">{t('Last month')}</th><th className="py-3 text-end font-medium">{t('Difference')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.label} className="border-b border-line last:border-0"><td className="py-3 text-muted">{row.label}</td><td className="py-3 text-end font-semibold">{unitValue(row.a, row.kind)}</td><td className="py-3 text-end">{unitValue(row.b, row.kind)}</td><td className="py-3 text-end text-accent">{row.a !== null && row.b !== null ? `${row.a - row.b > 0 ? '+' : ''}${unitValue(row.a - row.b, row.kind)}` : '—'}</td></tr>)}</tbody></table></div></Panel>
  </div>
}
