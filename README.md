# FitLog

A local-first fitness journal for one person. Apache serves the React interface and its PHP API; records and settings live in XAMPP MySQL. Progress photos remain on the computer. No cloud services or external APIs are used.

## Screenshots

Screenshots below use generated demo records and contain no personal logs or photos.

| Dashboard · dark | Weight progress |
| --- | --- |
| ![FitLog dashboard](docs/screenshots/dashboard-dark.png) | ![FitLog weight progress](docs/screenshots/weight-progress.png) |

| Calendar | Settings |
| --- | --- |
| ![FitLog calendar](docs/screenshots/calendar.png) | ![FitLog settings](docs/screenshots/settings.png) |

## Install and run (Windows)

1. Install XAMPP and start **Apache** and **MySQL** in the XAMPP Control Panel. Enable PHP extensions `pdo_mysql` and `fileinfo` if they are disabled.
2. Open phpMyAdmin, select **Import**, and import `database/fitlog.sql`. This creates the `fitlog` database and its tables.
3. Install Node.js 24.14 or newer for the build step. Run `npm ci` once while online. Double-click `start.bat` to build and copy into a detected XAMPP FitLog folder. You can also pass a site folder to the script, such as `start.bat "D:\xampp\htdocs\FitLog"`.
4. For a manual deployment, run `npm run build` and copy **only the contents of `dist`** into your XAMPP site folder. Include `.htaccess`, `api/index.php`, and `assets`. For `D:\xampp\htdocs\FitLog`, open **http://localhost/FitLog/**. Keep source files and `.env` outside `htdocs`.
5. XAMPP's usual local `root` account with no password works by default. If your MySQL credentials differ, copy `dist/api/config.example.php` to `dist/api/config.local.php` and edit it, then copy that file to your XAMPP site's `api` folder. Keep it private.

After setup, FitLog works without an internet connection. Structured data is stored in XAMPP MySQL (`127.0.0.1:3306/fitlog` by default). Original photos are stored in `FitLog-data/photos` beside XAMPP's `htdocs` directory, outside the site folder. The Settings page shows the actual location. Existing browser records are copied into MySQL the first time the app opens, if the database is empty.

## Daily use

- Press **Log Today** to mark gym and diet status. Weight and expanded details are optional.
- Click a heatmap square or calendar day to edit its log, notes, and optional measurements.
- Use **Workouts** for sessions, exercises, sets, and personal records.
- Add progress photos in **Progress Photos** and select two for side-by-side or slider comparison.
- Change language, theme, units, week start, visible modules, and check-in fields in **Settings**.

## Backups

**Settings → Export Backup** creates a `.fitlog.zip` backup. Include photos for a complete archive. **Import Backup** validates the archive before replacing existing MySQL records. Settings also exports CSV files for weight, attendance, measurements, and workouts. To back up directly from phpMyAdmin, select the `fitlog` database and use **Export**; back up the photo folder shown in Settings separately.

## Development

`npm run build` checks TypeScript and creates production assets in `dist/`, including `api/index.php`. Vite uses relative asset paths so the app works in an XAMPP subfolder. For frontend development, `npm run dev` starts Vite and the optional Node API on ports 5173 and 4173; `.env` configures that development API. XAMPP production uses the PHP API and `api/config.local.php`. The schema is in `database/fitlog.sql`. The storage adapter is `src/data/repository.ts`, and calculations live in `src/lib/stats.ts`.
