import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
export const uid = () => crypto.randomUUID()
export const todayKey = () => dateKey(new Date())
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const parseDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (key: string, count: number) => { const d = parseDate(key); d.setDate(d.getDate() + count); return dateKey(d) }
export const dateLabel = (key: string, language: 'en' | 'ar' = 'en', opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) => new Intl.DateTimeFormat(language === 'ar' ? 'ar-IQ' : 'en-US', opts).format(parseDate(key))
export const monthKey = (key: string) => key.slice(0, 7)
export const formatNumber = (n: number, language: 'en' | 'ar' = 'en', digits = 0) => new Intl.NumberFormat(language === 'ar' ? 'ar-IQ' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
export const weightDisplay = (kg: number, unit: 'kg' | 'lb') => unit === 'kg' ? kg : kg * 2.2046226218
export const weightInputKg = (value: number, unit: 'kg' | 'lb') => unit === 'kg' ? value : value / 2.2046226218
export const lengthDisplay = (cm: number, unit: 'cm' | 'in') => unit === 'cm' ? cm : cm / 2.54
export const lengthInputCm = (value: number, unit: 'cm' | 'in') => unit === 'cm' ? value : value * 2.54
