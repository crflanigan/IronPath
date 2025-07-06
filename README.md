# ActiveLife / "IronPup" Workout Tracker

ActiveLife is an open source workout tracking PWA inspired by the old ActiveTrax app. It focuses on a simple mobile-first interface and works completely offline once installed. The project currently targets personal use but is structured to be extended with server APIs.

## Features

- **Calendar-based schedule** generated from workout templates
- **Start and log workouts** with exercises, sets, abs and cardio blocks
- **Auto‑save** progress while you work out
- **Progress history** with statistics and export to CSV or JSON
- **Local storage persistence** with optional reset from the Settings dialog
- **Dark mode** support
- **PWA installability** via `manifest.json`, icons and a service worker for offline caching

## Tech Stack

- **React** with **TypeScript**
- **Tailwind CSS** and **shadcn/ui** components
- **Express** server
- **Drizzle ORM** with SQLite (schema in `shared/`)

## Local Development

```bash
npm install           # install dependencies
npm run dev           # start Express + Vite in development
npm run build         # build client and server bundles
npm start             # run the production build
```

Additional scripts:

- `npm run check` – type checking via `tsc`
- `npm run test` – unit tests with Vitest
- `npm run db:push` – push schema using Drizzle ORM

## Repository Structure

```
client/      frontend React app
  public/    static assets (manifest, icons, service worker)
  src/       pages, components and hooks
server/      Express entry point and dev helpers
shared/      Drizzle schema and shared types
```

## PWA Notes

The app includes a `manifest.json` with install icons (`icon-192x192.png`, `icon-512x512.png`) and registers a service worker (`sw.js`) to cache assets and enable offline usage.

---
Released under the MIT License. Contributions are welcome!
