import { ArrowRight, Check, Dumbbell, Flame, Plus, Scale, Utensils } from 'lucide-react'
import { useApp } from '../data/context'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { WeightChart } from '../components/WeightChart'
import { Panel, ProgressBar, SectionHead } from '../components/shared'
import { Button } from '../components/ui/button'
import { adherence, gymCount, gymStreak, monthStartKey, weekStartKey, weights } from '../lib/stats'
import { dateLabel, formatNumber, todayKey, weightDisplay } from '../lib/utils'
import { tr } from '../lib/i18n'

export function Dashboard({ onDay, go }: { onDay: (date: string) => void; go: (page: string) => void }) {
  const { data } = useApp(), s = data.settings, t = (x: string) => tr(x, s.language)
  const today = todayKey(), entry = data.days.find(d => d.date === today)
  const latest = weights(data.days).at(-1)
  const monthGym = gymCount(data.days, monthStartKey(today), today)
  const firstDayOfWeek = weekStartKey(today, s.weekStart)
  const weekGym = gymCount(data.days, firstDayOfWeek, today)
  const weekDietDays = data.days.filter(d => d.date >= firstDayOfWeek && d.date <= today && d.diet !== null)
  const weekDietFollowed = weekDietDays.filter(d => d.diet === 'followed').length
  const diet = adherence(data.days), streak = gymStreak(data.days)
  const recent = [...data.days].filter(d => d.gym || d.diet || d.weightKg || d.notes).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const todaySummary = [entry?.gym === 'completed' ? t('Gym completed') : entry?.gym === 'rest' ? t('Rest day') : entry?.gym === 'missed' ? t('Missed day') : '', entry?.diet === 'followed' ? t('Diet followed') : entry?.diet === 'cheat_meal' ? t('Cheat meal') : entry?.diet === 'cheat_day' ? t('Cheat day') : ''].filter(Boolean).join(' · ')
  return <div className="page-enter space-y-7">
    <div className="grid gap-5 lg:grid-cols-[1.5fr_.85fr]"><div className="flex min-h-58 flex-col justify-between rounded-[24px] border border-line bg-surface p-6 sm:p-8"><div><p className="eyebrow mb-3">{dateLabel(today, s.language, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1 className="max-w-xl text-3xl font-extrabold tracking-[-.055em] sm:text-[2.65rem] sm:leading-tight">{t('Today')}</h1><p className="mt-2 text-sm text-muted">{todaySummary || t('Nothing logged yet')}</p></div><Button size="lg" className="mt-7 w-fit" onClick={() => onDay(today)}><Plus size={18} />{t('Log Today')}</Button></div>
      <div className="flex min-h-58 flex-col rounded-[24px] border border-line bg-surface p-6 sm:p-8"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow mb-2">{t('This week')}</p><h2 className="text-lg font-bold tracking-tight">{t('Weekly gym goal')}</h2></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent"><Dumbbell size={18} /></span></div><div className="mt-5 flex items-end gap-2"><strong className="text-4xl font-bold leading-none tracking-tight">{formatNumber(weekGym, s.language)}</strong><span className="pb-0.5 text-sm text-muted">/ {formatNumber(s.weeklyGymGoal, s.language)} {t('Gym sessions').toLowerCase()}</span></div><div className="mt-4"><ProgressBar value={s.weeklyGymGoal ? weekGym / s.weeklyGymGoal * 100 : 0} /></div><div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-xs"><span className="text-muted">{t('Diet followed')}</span><strong><bdi dir="ltr">{formatNumber(weekDietFollowed, s.language)} / {formatNumber(weekDietDays.length, s.language)}</bdi> {t('days')}</strong></div></div></div>
    <Panel><SectionHead title={t('Yearly activity')} description={t('Every square is a day. Select one to see the full story.')} /><ActivityHeatmap onDay={onDay} /></Panel>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      { label: t('Current weight'), value: latest ? `${formatNumber(weightDisplay(latest.kg, s.weightUnit), s.language, 1)} ${s.weightUnit}` : '—', icon: Scale },
      { label: t('Gym this month'), value: formatNumber(monthGym, s.language), icon: Check },
      { label: t('Current gym streak'), value: `${formatNumber(streak.current, s.language)} ${t('days')}`, icon: Flame },
      { label: t('Diet adherence'), value: `${formatNumber(diet, s.language)}%`, icon: Utensils },
    ].map(item => <div key={item.label} className="rounded-[20px] border border-line bg-surface px-5 py-5"><div className="mb-4 flex items-center justify-between text-muted"><span className="text-xs font-medium">{item.label}</span><item.icon size={17} /></div><div className="text-[1.45rem] font-bold tracking-tight">{item.value}</div></div>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><Panel><SectionHead title={t('Weight trend')} action={<button onClick={() => go('weight')} className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">{t('Weight')} <ArrowRight size={13} /></button>} /><WeightChart height={245} /></Panel><Panel><SectionHead title={t('Your goals')} action={<button onClick={() => go('goals')} className="text-xs font-semibold text-accent hover:underline">{t('Goals')} →</button>} /><div className="space-y-6">{[
      { label: t('Weekly gym goal'), value: weekGym, goal: s.weeklyGymGoal, text: `${weekGym} / ${s.weeklyGymGoal}` },
      { label: t('Monthly gym goal'), value: monthGym, goal: s.monthlyGymGoal, text: `${monthGym} / ${s.monthlyGymGoal}` },
      { label: t('Diet goal'), value: diet, goal: s.dietGoal, text: `${diet}% / ${s.dietGoal}%` },
    ].map(g => <div key={g.label}><div className="mb-2 flex justify-between text-xs"><span className="text-muted">{g.label}</span><bdi dir="ltr" className="font-semibold">{g.text}</bdi></div><ProgressBar value={g.goal ? g.value / g.goal * 100 : 0} /></div>)}</div></Panel></div>
    <Panel><SectionHead title={t('Recent activity')} action={<button onClick={() => go('calendar')} className="text-xs font-semibold text-accent hover:underline">{t('Calendar')} →</button>} />{recent.length ? <div className="divide-y divide-line">{recent.map(day => <button key={day.date} onClick={() => onDay(day.date)} className="flex w-full items-center justify-between gap-4 py-3 text-start hover:text-accent"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${day.gym === 'completed' && day.diet === 'followed' ? 'bg-accent' : day.gym === 'completed' ? 'bg-diet' : 'bg-surface-3'}`} /><div><p className="text-sm font-semibold">{dateLabel(day.date, s.language)}</p><p className="text-xs text-muted">{[day.gym === 'completed' ? t('Gym completed') : day.gym === 'rest' ? t('Rest day') : '', day.diet === 'followed' ? t('Diet followed') : day.diet === 'cheat_meal' ? t('Cheat meal') : ''].filter(Boolean).join(' · ') || (day.weightKg ? t('Weight logging') : t('Notes'))}</p></div></div><ArrowRight size={16} className="text-muted" /></button>)}</div> : <p className="py-8 text-center text-sm text-muted">{t('No entries yet. Start with today.')}</p>}</Panel>
  </div>
}
