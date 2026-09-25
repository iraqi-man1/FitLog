# FitLog

A local-first fitness journal for one person. The React interface talks to a small Node.js API on `127.0.0.1`; workout records and settings live in XAMPP's local MySQL database, and progress photos stay in a local project folder. No cloud services or external APIs are used.

## Screenshots

Screenshots below use generated demo records and contain no personal logs or photos.

| Dashboard · dark | Weight progress |
| --- | --- |
| ![FitLog dashboard](docs/screenshots/dashboard-dark.png) | ![FitLog weight progress](docs/screenshots/weight-progress.png) |

| Calendar | Settings |
| --- | --- |
| ![FitLog calendar](docs/screenshots/calendar.png) | ![FitLog settings](docs/screenshots/settings.png) |

## Install and run (Windows)

1. Install XAMPP and start **MySQL** in the XAMPP Control Panel.
2. Open phpMyAdmin, select **Import**, and import `database/fitlog.sql`. This creates the `fitlog` database and its tables.
3. Install Node.js 24.14 or newer. Run `npm ci` once while online to install dependencies.
4. Copy `.env.example` to `.env`. Its defaults match XAMPP's usual local `root` account with no password. Edit `.env` if your MySQL credentials differ.
5. Double-click `start.bat`, or run `npm run build` then `npm start`.
6. Open **http://127.0.0.1:4173/**. Keep MySQL and the FitLog terminal running while using the app.

After setup, FitLog works without an internet connection. Structured data is stored in XAMPP MySQL (`127.0.0.1:3306/fitlog` by default); original photos are saved under `data/photos`. The Settings page shows the database connection and photo folder. Existing browser records are copied into MySQL the first time the app opens, if the database is empty. The `data` folder is ignored by Git so personal photos are not committed.

## Daily use

- Press **Log Today** to mark gym and diet status. Weight and expanded details are optional.
- Click a heatmap square or calendar day to edit its log, notes, and optional measurements.
- Use **Workouts** for sessions, exercises, sets, and personal records.
- Add progress photos in **Progress Photos** and select two for side-by-side or slider comparison.
- Change language, theme, units, week start, visible modules, and check-in fields in **Settings**.

## Backups

**Settings → Export Backup** creates a `.fitlog.zip` backup. Include photos for a complete archive. **Import Backup** validates the archive before replacing existing MySQL records. Settings also exports CSV files for weight, attendance, measurements, and workouts. To back up directly from phpMyAdmin, select the `fitlog` database and use **Export**; back up the `data/photos` folder separately.

## Development

`npm run dev` starts the local API on port 4173 and Vite on port 5173. `npm run build` checks TypeScript and creates production assets in `dist/`. `npm start` serves the built app and API. Connection settings are read from `.env`; see `.env.example`. The schema is in `database/fitlog.sql`. The storage adapter is `src/data/repository.ts`, and calculations live in `src/lib/stats.ts`.
