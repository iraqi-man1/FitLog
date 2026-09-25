import { useEffect, useState } from 'react'
import { Activity, CalendarDays, Camera, ChartNoAxesCombined, Dumbbell, Menu, Moon, NotebookPen, Ruler, Scale, Search, Settings2, Sun, Target, X } from 'lucide-react'
import { useApp } from './data/context'
import { DaySheet } from './components/DaySheet'
import { Button } from './components/ui/button'
import { tr } from './lib/i18n'
import { todayKey } from './lib/utils'
import { Dashboard } from './pages/Dashboard'
import { CalendarPage } from './pages/Calendar'
import { WorkoutsPage } from './pages/Workouts'
import { WeightPage } from './pages/Weight'
import { MeasurementsPage } from './pages/Measurements'
import { PhotosPage } from './pages/Photos'
import { GoalsPage } from './pages/Goals'
import { JourneyPage } from './pages/Journey'
import { StatisticsPage } from './pages/Statistics'
import { SettingsPage } from './pages/Settings'

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity }, { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell }, { id: 'weight', label: 'Weight', icon: Scale },
  { id: 'measurements', label: 'Measurements', icon: Ruler }, { id: 'photos', label: 'Progress Photos', icon: Camera },
  { id: 'goals', label: 'Goals & Records', icon: Target }, { id: 'journey', label: 'Journey', icon: NotebookPen },
  { id: 'statistics', label: 'Statistics', icon: ChartNoAxesCombined }, { id: 'settings', label: 'Settings', icon: Settings2 },
]
export default function App() {
  const { data, ready, error, saveSettings } = useApp()
  const s = data.settings, t = (x: string) => tr(x, s.language)
  const [page, setPage] = useState(() => location.hash.slice(1) || 'dashboard'), [day, setDay] = useState<string | null>(null), [search, setSearch] = useState(''), [menu, setMenu] = useState(false)
  useEffect(() => { document.documentElement.dataset.theme = s.theme; document.documentElement.dir = s.language === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = s.language }, [s.theme, s.language])
  useEffect(() => { const handler = () => setPage(location.hash.slice(1) || 'dashboard'); addEventListener('hashchange', handler); return () => removeEventListener('hashchange', handler) }, [])
  const go = (id: string) => { setPage(id); location.hash = id; setMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const items = navigation.filter(n => !s.hiddenModules.includes(n.id))
  const current = navigation.find(n => n.id === page)
  const openSearch = () => { if (/^\d{4}-\d{2}-\d{2}$/.test(search)) setDay(search) }
  const sidebar = <>
    <div className="mb-9 flex items-center gap-3 px-2"><img src={new URL('fitlog-mark.svg', new URL(import.meta.env.BASE_URL, location.href)).href} alt="" className="h-11 w-11" /><span className="text-xl font-extrabold tracking-[-.055em]">fitlog</span></div>
    <div className="mb-5 flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2 md:hidden"><input aria-label={t('Search date')} type="date" className="min-w-0 flex-1 bg-transparent text-xs outline-none" value={search} onChange={e => setSearch(e.target.value)} /><button onClick={() => { openSearch(); setMenu(false) }} className="text-xs font-bold text-accent">{t('Open')}</button></div>
    <nav className="space-y-0.5">{items.map(n => <button key={n.id} onClick={() => go(n.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[13px] font-semibold transition-colors ${page === n.id ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-surface-2 hover:text-foreground'}`}><n.icon size={18} strokeWidth={1.8} /><span>{t(n.label)}</span></button>)}</nav>
  </>
  if (!ready) return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Loading…</div>
  return <div className="min-h-screen"><aside className="fixed inset-y-0 start-0 z-30 hidden w-59 flex-col border-e border-line bg-surface px-4 py-6 md:flex">{sidebar}</aside>
    {menu && <><button className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMenu(false)} aria-label="Close menu" /><aside className="fixed inset-y-0 start-0 z-50 flex w-69 flex-col overflow-y-auto bg-surface px-4 py-6 shadow-2xl md:hidden"><button className="absolute end-4 top-5 text-muted" onClick={() => setMenu(false)} aria-label="Close menu"><X size={20} /></button>{sidebar}</aside></>}
    <div className="min-h-screen md:ms-59"><header className="sticky top-0 z-20 flex h-18 items-center justify-between gap-3 border-b border-line bg-background/95 px-4 backdrop-blur-xl sm:px-8"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenu(true)} aria-label="Open navigation"><Menu size={20} /></Button><p className="text-[15px] font-bold">{t(current?.label ?? 'Dashboard')}</p></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-2 sm:flex"><Search size={15} className="text-muted" /><input aria-label={t('Search date')} type="date" className="h-9 w-31 bg-transparent text-xs text-muted outline-none" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') openSearch() }} /><button onClick={openSearch} className="text-xs font-semibold text-accent">{t('Open')}</button></div><Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => void saveSettings({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' })}>{s.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</Button><Button size="sm" onClick={() => setDay(todayKey())} className="hidden sm:inline-flex">+ {t('Log Today')}</Button></div></header>
      <main className="mx-auto max-w-365 px-4 pb-20 pt-6 sm:px-8 sm:pt-8">{error && <div role="alert" className="mb-5 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}{page === 'calendar' ? <CalendarPage onDay={setDay} /> : page === 'workouts' ? <WorkoutsPage /> : page === 'weight' ? <WeightPage onDay={setDay} /> : page === 'measurements' ? <MeasurementsPage /> : page === 'photos' ? <PhotosPage /> : page === 'goals' ? <GoalsPage /> : page === 'journey' ? <JourneyPage /> : page === 'statistics' ? <StatisticsPage /> : page === 'settings' ? <SettingsPage /> : <Dashboard onDay={setDay} go={go} />}</main>
    </div><div className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-surface/95 px-2 py-2 backdrop-blur-md md:hidden">{navigation.slice(0, 4).map(n => <button key={n.id} onClick={() => go(n.id)} className={`flex flex-col items-center gap-0.5 px-2 text-[10px] font-semibold ${page === n.id ? 'text-accent' : 'text-muted'}`}><n.icon size={19} />{t(n.label)}</button>)}<button onClick={() => setMenu(true)} className="flex flex-col items-center gap-0.5 px-2 text-[10px] font-semibold text-muted"><Menu size={19} />{t('More')}</button></div><DaySheet date={day} onClose={() => setDay(null)} /></div>
}
