# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SHINSEI Launcher is an Electron-based Minecraft launcher for the SHINSEI RPG server. It features a custom frameless window, player authentication, a faction/class system, mod downloads, a shop, and leaderboards.

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

`electron/preload.ts` exposes `window.electronAPI` via `contextBridge` with four methods: `minimize`, `maximize`, `close`, `openExternal`. All window controls in the UI go through this bridge.

### React renderer

`src/App.tsx` owns the root layout (Titlebar, Sidebar, BottomBar, active page) and switches pages via a `currentPage` string from the Zustand store.

State lives in `src/store/launcherStore.ts` (Zustand). It holds auth state, server status, download progress, RAM/Java settings, and navigation state. All pages and components read/write from this single store.

### Styling

Tailwind CSS with a custom dark gaming theme defined in `tailwind.config.js`:
- **Primary accent**: Violet `#7c3aed` / Cyan `#06b6d4`
- **Backgrounds**: `#0a0a0f`, `#0f0f1a`, `#12121e`
- **Grade colors**: D (white) → C (green) → B (blue) → A (purple) → S (orange) → SS (red)
- **Fonts**: Rajdhani (body), Share Tech Mono (display)

Global styles and scrollbar overrides live in `src/index.css`.

### Shared types (`@shinsei/shared`)

`packages/shared/src/types.ts` defines the game domain enums and interfaces: `Grade`, `Class`, `Faction`, `ModEntry`, `ServerManifest`, `PlayerProfile`. Import from `@shinsei/shared` — path aliasing is configured in both `vite.config.ts` and `tsconfig.json`.

## Key files

| File | Purpose |
|------|---------|
| `apps/launcher/electron/main.ts` | Window creation (1100×650, frameless), IPC handlers |
| `apps/launcher/electron/preload.ts` | `contextBridge` → `window.electronAPI` |
| `apps/launcher/src/App.tsx` | Root layout and page routing |
| `apps/launcher/src/store/launcherStore.ts` | All application state (Zustand) |
| `apps/launcher/vite.config.ts` | Vite + Electron + path alias config |
| `apps/launcher/tailwind.config.js` | Custom design tokens |
| `packages/shared/src/types.ts` | Game domain types shared across the workspace |
