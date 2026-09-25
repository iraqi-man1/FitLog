import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../data/context'
import { dateLabel, weightDisplay } from '../lib/utils'
import { weights } from '../lib/stats'
import { tr } from '../lib/i18n'

export function WeightChart({ start, height = 260 }: { start?: string; height?: number }) {
  const { data } = useApp()
  const s = data.settings
  const all = weights(data.days).filter(w => !start || w.date >= start)
  const points = all.map(w => ({ date: w.date, weight: Number(weightDisplay(w.kg, s.weightUnit).toFixed(1)) }))
  if (!points.length) return <div className="flex h-52 items-center justify-center text-sm text-muted">{tr('No weights logged in this range.', s.language)}</div>
  const min = Math.min(...points.map(p => p.weight)), max = Math.max(...points.map(p => p.weight))
  return <div style={{ height }} className="w-full" dir="ltr"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 18, right: 10, left: -22, bottom: 0 }}><CartesianGrid stroke="var(--line)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="date" tickFormatter={v => dateLabel(v, s.language, { month: 'short', day: 'numeric' })} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} /><YAxis domain={[Math.floor(min - 2), Math.ceil(max + 2)]} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={label => dateLabel(String(label), s.language)} formatter={value => [`${value} ${s.weightUnit}`, tr('Weight', s.language)]} /><Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }} activeDot={{ r: 6, fill: 'var(--accent)' }} />{points.length > 1 && <><ReferenceDot x={points.find(p => p.weight === min)?.date} y={min} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} /><ReferenceDot x={points.find(p => p.weight === max)?.date} y={max} r={5} fill="var(--muted)" stroke="var(--surface)" strokeWidth={2} /></>}</LineChart></ResponsiveContainer></div>
}
