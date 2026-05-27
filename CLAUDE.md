# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SHINSEI Launcher is an Electron-based Minecraft launcher for the SHINSEI RPG server. It features a custom frameless window, Microsoft OAuth authentication, a faction/class system, mod downloads, a shop, and leaderboards.

## Commands

Run from the repo root using `pnpm`:

```bash
pnpm dev        # Start Vite dev server + Electron with HMR
pnpm build      # TypeScript check + Vite production build
pnpm electron   # Launch the already-built Electron app
```

There are no test or lint scripts defined. To type-check manually:

```bash
cd apps/launcher && pnpm tsc --noEmit
```

To capture a screenshot of the running app:

```bash
cd apps/launcher && node screenshot.mjs
```

## Architecture

### Monorepo layout

- `apps/launcher/` — the Electron + React application
- `packages/shared/` — shared TypeScript types consumed by the launcher via `@shinsei/shared`

### Electron dual-process model

`vite-plugin-electron` bundles two separate entry points:

| Process | Entry | Output |
|---------|-------|--------|
| Main | `electron/main.ts` | `dist-electron/main.js` |
| Preload | `electron/preload.ts` | `dist-electron/preload.js` |
| Renderer | `src/main.tsx` | `dist/` |

**IPC handlers in `electron/main.ts`**:
- `auth:microsoft` / `auth:loadSession` / `auth:logout` — Microsoft OAuth flow using `./auth` and `./session` modules
- `game:launch` — launches Minecraft via `./minecraft`; emits `game:progress` (label, percent), `game:log`, `game:crashed` back to renderer
- `window:minimize` / `window:maximize` / `window:close`
- `shell:openExternal`

**`electron/preload.ts`** exposes `window.electronAPI` via `contextBridge`:
- Window: `minimize()`, `maximize()`, `close()`, `openExternal(url)`
- Auth: `loginMicrosoft()`, `loadSession()`, `logout()` (all return Promises)
- Game: `launchGame(opts)`, `onGameProgress(cb)`, `onGameLog(cb)`, `onGameCrashed(cb)`

### React renderer

`src/App.tsx` owns the root layout (Titlebar, Sidebar, BottomBar, DownloadBar, active page) and switches pages via `currentPage` from the Zustand store. On mount it calls `loadSession()` for silent login; unauthenticated users see `<LoginPage />`.

Pages (value of `currentPage`): `'home'`, `'profile'`, `'ranking'` (placeholder), `'shop'`, `'settings'`.

**Permanent layout components**:
- `Titlebar` — frameless drag region + window controls
- `Sidebar` — 56px-wide icon nav + logout button
- `BottomBar` — server status, ping, user badges, PLAY button; polls mock server state every 30s
- `DownloadBar` — progress bar, only visible when `isDownloading === true`

### Zustand store (`src/store/launcherStore.ts`)

Single store for all app state. Key shape:

```typescript
user: {
  username, uuid, accessToken,
  gradeShop: 'Kaigen'|'Raijin'|'Oni'|'Shogun'|'Archon',
  gradeGameplay: 'D'|'C'|'B'|'A'|'S'|'SS',
  faction: Faction, playTime, dungeonsCompleted, pvpKills, xpCurrent, xpForNext
} | null
selectedClass: Class | null
downloadProgress: number       // 0–100
isDownloading: boolean
currentDownloadFile: string
serverStatus: { online: boolean; players: number }
ping: number | null
news: NewsItem[]
currentPage: Page
settings: { javaPath, ramGb, resolution, closeLauncherOnPlay, minimizeToTray }
```

### Styling

Tailwind CSS with a custom dark gaming theme defined in `tailwind.config.js`:
- **Primary accent**: Violet `#7c3aed` / Cyan `#06b6d4`
- **Backgrounds**: `#0a0a0f` (base), `#0f0f1a` (card), `#12121e` (input)
- **Gameplay grade colors**: D (white) → C (green) → B (blue) → A (purple) → S (orange) → SS (red)
- **Shop grade colors**: Kaigen (cyan) → Raijin (gold) → Oni (red) → Shogun (purple) → Archon (gold)
- **Fonts**: Rajdhani (body), Share Tech Mono (display)

Global styles and scrollbar overrides live in `src/index.css`.

### Constants (`src/constants/`)

- `grades.ts` — `GRADE_CONFIG`: sprite background-positions and colors for each gameplay grade
- `shopGrades.ts` — `SHOP_GRADE_CONFIG` and `SHOP_GRADE_ORDER` for the 5 shop tiers

### Shared types (`@shinsei/shared`)

`packages/shared/src/types.ts` defines: `Grade`, `Class`, `Faction` enums, and `ModEntry`, `ServerManifest`, `PlayerProfile` interfaces. Import from `@shinsei/shared` — path aliasing is configured in both `vite.config.ts` and `tsconfig.json`.

## Key files

| File | Purpose |
|------|---------|
| `apps/launcher/electron/main.ts` | Window creation (1100×650, frameless), IPC handlers, auth/game orchestration |
| `apps/launcher/electron/preload.ts` | `contextBridge` → `window.electronAPI` |
| `apps/launcher/src/App.tsx` | Root layout, auth gate, page routing |
| `apps/launcher/src/store/launcherStore.ts` | All application state (Zustand) |
| `apps/launcher/src/constants/grades.ts` | Gameplay grade sprite config |
| `apps/launcher/src/constants/shopGrades.ts` | Shop grade display config |
| `apps/launcher/vite.config.ts` | Vite + Electron + path alias config |
| `apps/launcher/tailwind.config.js` | Custom design tokens |
| `packages/shared/src/types.ts` | Game domain types shared across the workspace |
