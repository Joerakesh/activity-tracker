# activity-tracker

An Electron application with React and TypeScript

## Features

- Local-first desktop activity tracking with a compact floating widget (hidden on startup; toggle with `Ctrl+Shift+Space`)
- Daily active/idle summaries and per-application usage totals
- Analytics dashboard with 7-day and 30-day views
- Daily active-time trend, app usage ranking, average active time, and period comparison
- Configurable analytics cards, with layout preferences stored locally
- Existing keyboard shortcut, system tray, startup, and always-on-top settings

## Analytics notes

Analytics are derived from the local daily aggregates and application totals. The current collector samples foreground application usage every five seconds. Historical hourly sessions, exact app-switch counts, and detailed timelines are not inferred from aggregate data. Days with no stored activity are shown as zero in the selected date window; that means no recorded activity, not proof that the computer was unused.

The analytics page does not add a remote service or upload activity data. The dashboard card visibility preference is stored in renderer local storage, while activity records remain in Electron's user-data directory.

## Development verification

Run the checks before packaging:

```bash
npm run typecheck
npm run lint
npm run build
```

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
