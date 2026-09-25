import { Award, Camera, Dumbbell, Flame, Scale, Target } from 'lucide-react'
import { useApp } from '../data/context'
import { Empty, Panel, SectionHead } from '../components/shared'
import { journeyEvents } from '../lib/stats'
import { dateLabel, formatNumber } from '../lib/utils'
import { tr } from '../lib/i18n'

const icons = { gym: Dumbbell, weight: Scale, photo: Camera, record: Award, goal: Target, streak: Flame }
export function JourneyPage() {
  const { data } = useApp(), s = data.settings, t = (x: string) => tr(x, s.language)
  const events = journeyEvents(data)
  const eventTitle = (title: string) => { if (s.language === 'en') return title; const count = title.match(/^(\d+)(?:-day)? (gym sessions|gym streak|consistency streak)$/); if (count) return `${formatNumber(Number(count[1]), s.language)} ${t(count[2])}`; for (const suffix of ['progress photo', 'personal record']) if (title.endsWith(suffix)) return `${title.slice(0, -suffix.length)} ${t(suffix)}`; return t(title) }
  return <div className="page-enter"><SectionHead eyebrow={t('YOUR STORY')} title={t('Your journey')} description={t('The moments your own logs made meaningful.')} /><Panel>{events.length ? <div className="relative ms-4 border-s border-line ps-7">{events.map(e => { const Icon = icons[e.kind]; return <div key={e.id} className="relative pb-8 last:pb-0"><div className="absolute -start-[44px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-2 text-accent"><Icon size={15} /></div><p className="text-xs text-muted">{dateLabel(e.date, s.language)}</p><p className="mt-1 font-bold">{eventTitle(e.title)}</p>{e.detail && <p className="mt-1 text-sm text-muted">{e.detail}</p>}</div> })}</div> : <Empty title={t('Your timeline will grow as you log.')} detail={t('Workouts, weight milestones, photos, and goals will appear here.')} />}</Panel></div>
}
