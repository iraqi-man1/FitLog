# FitLog architecture

## Runtime and privacy

- Vite serves a React + TypeScript single-page application on `127.0.0.1`. A production build contains its own JavaScript, CSS, icons, and fonts; no CDN, account, telemetry, remote database, or API is used.
- `src/data/repository.ts` is the storage boundary. The first adapter uses IndexedDB through `idb`. A Tauri adapter can later implement the same methods without changing pages or calculation code.
- IndexedDB stores structured records and photo `Blob`s in separate object stores. Photo URLs are generated only in memory while the app is open. No image leaves the browser.
- Browser storage is tied to the localhost origin and browser profile. Export Backup is the portable copy. The Settings page exposes a persistent-storage request when supported.

## Database schema (IndexedDB version 1)

| Store | Key | Fields |
| --- | --- | --- |
| `days` | `date` (`YYYY-MM-DD`) | gym status, diet status, optional weight (kg), notes, energy, sleep hours, water liters, steps |
| `workouts` | `id` | date, workout type, duration, quality, notes, exercise entries with sets/reps/weight kg |
| `exercises` | `id` | name, notes, whether weighted |
| `measurements` | `id` | date, standard measurements in cm, custom measurement map, notes |
| `photos` | `id` | date, category, optional weight/body-fat, notes, MIME type |
| `photoBlobs` | `id` | local image Blob |
| `settings` | `key` | theme, language, units, week start, goals, heatmap behavior, optional fields, hidden modules, custom workout types |

Records use a stable local date key rather than a UTC timestamp so check-ins do not move between days after timezone changes. Weight and length are always stored in kg and cm; display units are converted at the UI boundary. Days and workouts remain independent: a quick gym check-in does not require a detailed workout, while saving a workout marks that day as gym completed.

## Pages and component hierarchy

- `AppShell`: responsive sidebar, mobile navigation, page header, language and theme controls.
- `Dashboard`: today status and quick check-in; yearly `ActivityHeatmap`; compact metrics; goal progress; weight trend; recent activity.
- `Calendar`: month navigation, status indicators, day inspector.
- `Workouts`: session history, session editor, custom types, exercises, personal records.
- `Weight`: range-selectable Recharts trend, milestones, summary, quick weight entry.
- `Measurements`: optional measurement editor and history.
- `Photos`: local image import, chronological gallery, two-photo selection, side-by-side and `react-compare-slider` comparison.
- `Goals & Records`: editable targets and exercise records.
- `Journey`: chronological events derived from recorded data.
- `Statistics`: local summary and period comparison with explicitly descriptive statistics.
- `Settings`: appearance, language, units, input preferences, modules, CSV exports, validated backup import/export.
- Shared `DaySheet` is opened from heatmap squares, calendar cells, recent activity, and Log Today.

## Calculations

Selectors in `src/lib/stats.ts` compute streaks, attendance, adherence, consistency, weight changes, workout volume, milestones, summaries, and timeline events from stored records. Gym streaks count consecutive completed gym days; diet streaks count consecutive followed days. A streak may continue from yesterday when today has no entry. Diet adherence uses days with an explicit diet result as its denominator. Consistency uses explicitly logged days and requires both gym completion and diet adherence.

## Backup format

Export writes a versioned `.fitlog.zip` containing `manifest.json`, `data.json`, and optional `photos/<id>.<ext>` files. Import parses and validates all structured records and referenced photo files before asking whether to replace current data. Import then replaces all stores in one IndexedDB transaction. CSV files cover weight, attendance, measurements, and workouts. Backup and CSV creation happen locally.

## Library review

| Feature | Library | License |
| --- | --- | --- |
| Calendar heatmap | [`react-calendar-heatmap`](https://github.com/kevinsqi/react-calendar-heatmap) | MIT |
| Weight and statistics charts | [`recharts`](https://github.com/recharts/recharts) | MIT |
| Image comparison | [`react-compare-slider`](https://github.com/nerdyman/react-compare-slider) | MIT |
| Interface primitives | [shadcn/ui](https://github.com/shadcn-ui/ui) pattern with [Radix UI](https://github.com/radix-ui/primitives) | MIT |
| Icons | [`lucide-react`](https://github.com/lucide-icons/lucide) | ISC |
| IndexedDB promises | [`idb`](https://github.com/jakearchibald/idb) | ISC |
| Zip backup | [`jszip`](https://github.com/Stuk/jszip/blob/main/LICENSE.markdown) | MIT option (dual MIT/GPLv3) |
| Styles | [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT |
| Offline fonts | [Manrope](https://fontsource.org/fonts/manrope/about) and [Cairo](https://fontsource.org/fonts/cairo/about) via Fontsource | OFL-1.1 |

The application uses these libraries for the complex interaction they already solve. Calendar month navigation, status dots, date arithmetic, and derived fitness statistics are application-specific logic.
