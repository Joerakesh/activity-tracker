# Activity Tracker

A privacy-focused desktop activity tracker built with **Electron, React and TypeScript**. It records foreground application usage locally and turns those records into daily summaries and usage analytics.

> **Privacy first:** activity records are stored on the computer in Electron's user-data directory. The current analytics experience does not upload activity data to a remote service.

## What it does

- Tracks foreground application usage using periodic sampling.
- Separates active and idle time in daily summaries.
- Shows per-application usage totals.
- Provides 7-day and 30-day analytics views.
- Displays active-time trends, app rankings, averages and period comparisons.
- Supports a compact floating widget, system tray integration and keyboard shortcut controls.
- Stores dashboard card visibility preferences locally.

## How the analytics work

The collector samples the foreground application approximately every five seconds. Analytics are calculated from the records collected by the app.

A few important interpretation notes:

- App totals are estimates based on sampling, not a perfect record of every second.
- The current data model does not claim to provide historical hourly sessions or exact app-switch counts.
- A day with no stored records means no activity was recorded; it does not prove the computer was unused.
- Browser tab-level tracking and mobile usage collection are not part of the current desktop feature set.

## Technology

| Area | Technology |
| --- | --- |
| Desktop runtime | Electron |
| UI | React |
| Language | TypeScript |
| Build tooling | Electron Vite, Vite |
| Window detection | get-windows |
| Packaging | electron-builder |

## Project setup

### Prerequisites

- Node.js (use a current supported LTS release)
- npm
- Windows, macOS or Linux for development; platform-specific packaging may require that platform's build tools

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Type-check and build

```bash
npm run typecheck
npm run lint
npm run build
```

## Package the application

```bash
# Windows installer
npm run build:win

# macOS package
npm run build:mac

# Linux package
npm run build:linux
```

Build outputs and platform-specific requirements depend on the electron-builder configuration.

## Privacy and security

- Keep activity data local unless a future, explicitly enabled sync feature is introduced.
- Explain the purpose of foreground-window monitoring clearly to users.
- Avoid collecting window titles or other potentially sensitive content unless there is a clear need and explicit consent.
- Review Electron IPC boundaries and keep privileged operations in the main process.
- Do not commit personal activity databases, credentials or local configuration.

## Roadmap

Potential next steps include stronger data export and backup, configurable retention, more detailed but privacy-conscious reports, improved idle detection, automated tests and signed release builds.

## Contributing

Issues and focused pull requests are welcome. Please include reproduction steps for bugs and describe the privacy impact of any feature that collects additional activity data.
