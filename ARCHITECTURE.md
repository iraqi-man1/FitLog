# FitLog architecture

## Runtime and data location

- A React + TypeScript single-page app is served by a Node.js process bound only to `127.0.0.1`. The same process exposes the local `/api` routes and serves the production frontend.
- XAMPP MySQL stores records in database `fitlog`; import `database/fitlog.sql` with phpMyAdmin. `.env` configures host, port, user, and password. Defaults match a standard local XAMPP install.
- Progress photos are binary files under `data/photos`; MySQL stores their metadata and generated filenames. No photo or record is sent to a remote service. The `data` folder is excluded from Git.
- `src/data/repository.ts` is the frontend storage boundary. `server/database.mjs` owns MySQL statements and transactions; `server/index.mjs` owns HTTP, file storage, and static serving.
- On first launch, the frontend checks whether the MySQL database is empty. If the old `fitlog-local` IndexedDB contains records, it sends a validated local archive to the API. The API imports only while the database is empty. The old browser database remains in place as a recovery copy.
- Development starts Vite on port 5173 and the same API server on port 4173. Vite proxies `/api` to that server, so development and production share one local database.

## MySQL schema

| Table | Key | Fields |
| --- | --- | --- |
| `days` | `date` (`YYYY-MM-DD`) | gym status, diet status, optional weight (kg), notes, energy, sleep, water, steps |
| `exercises` | `id` | name, notes, whether the lift is weighted |
| `workouts` | `id` | date, workout type, duration, quality, notes |
| `workout_exercises` | (`workout_id`, `position`) | exercise reference and order within a workout |
| `workout_sets` | (`workout_id`, `exercise_position`, `set_number`) | reps and weight (kg) |
| `measurements` | `id` | date, standard measurements in cm, custom measurement map, notes |
| `photos` | `id` | date, category, optional weight/body-fat, notes, MIME type, local filename |
| `settings` | `1` | theme, language, units, week start, goals, heatmap behavior, optional fields, hidden modules, custom workout types |

Foreign keys cascade workout set removal with its parent exercise entry and prevent deleting an exercise still referenced by a workout. Weight and length are stored in kg and cm; display units are converted at the UI boundary. Stable local date keys prevent entries shifting across days after timezone changes. See `database/fitlog.sql` for the importable schema.

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
- `Statistics`: local summary and period comparison with descriptive statistics.
- `Settings`: appearance, language, units, input preferences, MySQL/photo paths, CSV exports, validated backup import/export.
- Shared `DaySheet` is opened from heatmap squares, calendar cells, recent activity, and Log Today.

## Local API and file handling

The server accepts requests only on loopback and uses same-origin requests in production. It exposes read, create/update, and delete operations for the app's existing repository methods. MySQL writes use parameterized statements and transactions. Imported photos are written under random filenames; the database stores only those generated names.

The server enforces request-size limits for JSON, image, and backup files. Backup replacement first validates the ZIP, manifest, structured records, and referenced images, then stages image files and replaces database rows in one MySQL transaction. If the database transaction fails, staged files are removed. Browser-origin data is migrated only once and only into an empty database.

## Calculations

Selectors in `src/lib/stats.ts` compute streaks, attendance, adherence, consistency, weight changes, workout volume, milestones, summaries, and timeline events from stored records. Gym streaks count consecutive completed gym days; diet streaks count consecutive followed days. A streak may continue from yesterday when today has no entry. Diet adherence uses days with an explicit diet result as its denominator. Consistency uses explicitly logged days and requires both gym completion and diet adherence.

## Backup format

Export writes a versioned `.fitlog.zip` containing `manifest.json`, `data.json`, and optional `photos/<id>` binary entries. Import validates the archive and displays record counts before replacement. CSV files cover weight, attendance, measurements, and workouts. All archive generation and parsing happens locally; the server only receives the archive over loopback for a confirmed restore.

## Library review

| Feature | Library | License |
| --- | --- | --- |
| Calendar heatmap | [`react-calendar-heatmap`](https://github.com/kevinsqi/react-calendar-heatmap) | MIT |
| Weight and statistics charts | [`recharts`](https://github.com/recharts/recharts) | MIT |
| Image comparison | [`react-compare-slider`](https://github.com/nerdyman/react-compare-slider) | MIT |
| Interface primitives | [shadcn/ui](https://github.com/shadcn-ui/ui) pattern with [Radix UI](https://github.com/radix-ui/primitives) | MIT |
| Icons | [`lucide-react`](https://github.com/lucide-icons/lucide) | ISC |
| IndexedDB migration reader | [`idb`](https://github.com/jakearchibald/idb) | ISC |
| Zip backup | [`jszip`](https://github.com/Stuk/jszip/blob/main/LICENSE.markdown) | MIT option (dual MIT/GPLv3) |
| Styles | [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT |
| Offline fonts | [Manrope](https://fontsource.org/fonts/manrope/about) and [Cairo](https://fontsource.org/fonts/cairo/about) via Fontsource | OFL-1.1 |

Calendar month navigation, date arithmetic, and derived fitness statistics remain application-specific behavior; the complex chart, heatmap, and image comparison interactions use their established libraries.
