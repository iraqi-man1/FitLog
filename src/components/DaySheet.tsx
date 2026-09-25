import { useEffect, useState } from 'react'
import { Camera, Check, Dumbbell, Moon, X } from 'lucide-react'
import { useApp } from '../data/context'
import { repository } from '../data/repository'
import type { DayLog, DietStatus, GymStatus, PhotoCategory, PhotoMeta } from '../data/types'
import { dateLabel, formatNumber, lengthDisplay, uid, weightDisplay, weightInputKg } from '../lib/utils'
import { tr } from '../lib/i18n'
import { Button } from './ui/button'
import { Dialog } from './ui/dialog'
import { Field, inputClass, textareaClass } from './shared'

const empty = (date: string): DayLog => ({ date, gym: null, diet: null })
function DayPhoto({ photo }: { photo: PhotoMeta }) {
  const [src, setSrc] = useState('')
  useEffect(() => { let url = ''; let alive = true; void repository.getPhotoBlob(photo.id).then(blob => { if (blob && alive) { url = URL.createObjectURL(blob); setSrc(url) } }); return () => { alive = false; if (url) URL.revokeObjectURL(url) } }, [photo.id])
  return src ? <img src={src} alt={`${photo.category} progress`} className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface-3"><Camera size={18} /></div>
}
export function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { data, saveDay, savePhoto } = useApp()
  const { settings } = data
  const t = (s: string) => tr(s, settings.language)
  const [draft, setDraft] = useState<DayLog>(empty(date ?? ''))
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const validPhoto = !photo || ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(photo.type)
  const dayWorkouts = data.workouts.filter(w => w.date === date)
  const dayMeasurements = data.measurements.filter(m => m.date === date)
  const dayPhotos = data.photos.filter(p => p.date === date)
  useEffect(() => { if (date) { setDraft(data.days.find(d => d.date === date) ?? empty(date)); setPhoto(null) } }, [date, data.days])
  const update = <K extends keyof DayLog>(key: K, value: DayLog[K]) => setDraft(prev => ({ ...prev, [key]: value }))
  const save = async () => {
    setSaving(true)
    try {
      await saveDay(draft)
    if (photo && validPhoto) await savePhoto({ id: uid(), date: draft.date, category: 'Front' as PhotoCategory, mimeType: photo.type, weightKg: draft.weightKg }, photo)
      onClose()
    } finally { setSaving(false) }
  }
  const gymOptions: { value: GymStatus; label: string; icon: typeof Dumbbell }[] = [
    { value: 'completed', label: t('Gym completed'), icon: Dumbbell }, { value: 'rest', label: t('Rest day'), icon: Moon }, { value: 'missed', label: t('Missed day'), icon: X },
  ]
  const dietOptions: { value: DietStatus; label: string }[] = [
    { value: 'followed', label: t('Diet followed') }, { value: 'cheat_meal', label: t('Cheat meal') }, { value: 'cheat_day', label: t('Cheat day') }, { value: 'missed', label: t('Missed day') },
  ]
  return <Dialog open={!!date} onOpenChange={value => { if (!value) onClose() }} title={`${t('Daily check-in')} · ${date ? dateLabel(date, settings.language) : ''}`}>
    <div className="space-y-5">
      <div><p className="mb-2 text-xs font-semibold text-muted">{t('Gym status')}</p><div className="grid grid-cols-3 gap-2">{gymOptions.map(option => <button key={option.value} type="button" onClick={() => update('gym', draft.gym === option.value ? null : option.value)} className={`flex min-h-17 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${draft.gym === option.value ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface-2 text-muted hover:text-foreground'}`}><option.icon size={18} />{option.label}</button>)}</div></div>
      <div><p className="mb-2 text-xs font-semibold text-muted">{t('Diet status')}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{dietOptions.map(option => <button key={option.value} type="button" onClick={() => update('diet', draft.diet === option.value ? null : option.value)} className={`min-h-11 rounded-xl border px-2 text-xs font-semibold transition-colors ${draft.diet === option.value ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface-2 text-muted hover:text-foreground'}`}>{option.label}</button>)}</div></div>
      <Field label={`${t('Body weight')} · ${settings.weightUnit} (${t('Optional')})`}><input className={inputClass} type="number" min="1" max="1500" step="0.1" inputMode="decimal" value={draft.weightKg === undefined ? '' : Number(weightDisplay(draft.weightKg, settings.weightUnit).toFixed(1))} onChange={e => update('weightKg', e.target.value === '' ? undefined : weightInputKg(Number(e.target.value), settings.weightUnit))} placeholder="—" /></Field>
      <details className="group rounded-xl border border-line bg-surface-2 p-4" open={Boolean(draft.notes || draft.energy || draft.sleepHours || draft.waterLiters || draft.steps)}><summary className="cursor-pointer text-sm font-semibold text-muted group-open:mb-4">{t('Optional details')}</summary><div className="grid grid-cols-2 gap-3">
        {settings.optionalFields.energy && <Field label={`${t('Energy')} · 1–5`}><input className={inputClass} type="number" min="1" max="5" value={draft.energy ?? ''} onChange={e => update('energy', e.target.value ? Number(e.target.value) : undefined)} /></Field>}
        {settings.optionalFields.sleep && <Field label={t('Sleep hours')}><input className={inputClass} type="number" min="0" max="24" step="0.5" value={draft.sleepHours ?? ''} onChange={e => update('sleepHours', e.target.value ? Number(e.target.value) : undefined)} /></Field>}
        {settings.optionalFields.water && <Field label={`${t('Water intake')} · L`}><input className={inputClass} type="number" min="0" max="30" step="0.1" value={draft.waterLiters ?? ''} onChange={e => update('waterLiters', e.target.value ? Number(e.target.value) : undefined)} /></Field>}
        {settings.optionalFields.steps && <Field label={t('Steps')}><input className={inputClass} type="number" min="0" max="100000" step="1" value={draft.steps ?? ''} onChange={e => update('steps', e.target.value ? Number(e.target.value) : undefined)} /></Field>}
        <div className="col-span-2"><Field label={t('Notes')}><textarea className={textareaClass} maxLength={2000} value={draft.notes ?? ''} onChange={e => update('notes', e.target.value)} placeholder={t('A quick note about today…')} /></Field></div>
        {settings.optionalFields.photo && <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 py-3 text-sm text-muted hover:text-foreground"><Camera size={17} />{photo ? photo.name : t('Add photo')}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => setPhoto(e.target.files?.[0] ?? null)} /></label>}
      </div></details>
      {(dayWorkouts.length > 0 || dayMeasurements.length > 0 || dayPhotos.length > 0) && <div className="rounded-xl border border-line p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{t('Also recorded this day')}</p><div className="space-y-4">{dayWorkouts.map(w => <div key={w.id}><p className="text-sm font-bold">{t(w.type)} {w.durationMinutes ? `· ${formatNumber(w.durationMinutes, settings.language)} ${t('min')}` : ''}</p>{w.exercises.length > 0 && <p className="mt-1 text-xs text-muted">{w.exercises.map(e => `${data.exercises.find(x => x.id === e.exerciseId)?.name ?? t('Exercises')} (${e.sets.length} ${t('Sets')})`).join(' · ')}</p>}{w.notes && <p className="mt-1 text-xs text-muted">{w.notes}</p>}</div>)}{dayMeasurements.map(m => <div key={m.id}><p className="text-sm font-bold">{t('Body measurements')}</p><p className="mt-1 text-xs text-muted">{[...Object.entries(m.values), ...Object.entries(m.custom)].map(([name, cm]) => `${t(name[0].toUpperCase() + name.slice(1))}: ${formatNumber(lengthDisplay(cm, settings.lengthUnit), settings.language, 1)} ${settings.lengthUnit}`).join(' · ')}</p></div>)}{dayPhotos.length > 0 && <div><p className="mb-2 text-sm font-bold">{t('Progress Photos')}</p><div className="flex flex-wrap gap-2">{dayPhotos.map(p => <DayPhoto key={p.id} photo={p} />)}</div></div>}</div></div>}
      {!validPhoto && <p role="alert" className="text-xs text-danger">{t('Use a JPG, PNG, WebP, or GIF image.')}</p>}
      <Button className="w-full" onClick={() => void save()} disabled={saving || !validPhoto}><Check size={17} />{saving ? t('Saving…') : t('Save day')}</Button>
    </div>
  </Dialog>
}
