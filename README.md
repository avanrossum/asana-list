# Panoptisana

[![CI](https://github.com/avanrossum/panoptisana/actions/workflows/ci.yml/badge.svg)](https://github.com/avanrossum/panoptisana/actions/workflows/ci.yml)

A fast, focused Asana visibility tool for macOS. Lives in your menu bar, shows your tasks and projects at a glance.

## Features

- **Task & Project Lists** — Searchable, sortable lists of all incomplete tasks and active projects
- **Task Detail Panel** — Full task details including description, subtasks, project memberships, and due dates
- **Comments** — Read and post comments with @mention support (autocomplete dropdown, profile link resolution)
- **Inbox Notifications** — Slide-out drawer showing recent activity on your assigned tasks
- **Activity Highlighting** — Gold border on tasks with activity since you last viewed them
- **Smart Filtering** — Filter by user, exclude or include tasks/projects by name pattern, pin items to top
- **Project Filtering** — Filter tasks by project, toggle "Only My Projects"
- **CSV Export** — Export filtered task/project lists with configurable fields and sections
- **Right-Click Context Menu** — Exclude items, pin to top, copy GID/URL
- **Dark/Light/System Theme** — 7 accent colors, matches your macOS appearance
- **Global Hotkey** — Ctrl+Shift+A to toggle visibility (configurable)
- **Configurable Browser** — Open Asana links in Safari, Chrome, Firefox, Arc, Zen, or the Asana desktop app
- **Auto-Updates** — Automatic update checks via GitHub releases
- **Encrypted API Key** — Your Asana API key is stored securely via the OS Keychain

## Getting Started

### Prerequisites

- macOS 12 or later
- An Asana account with a [Personal Access Token](https://app.asana.com/0/my-apps)

### Install from Release

Download the latest `.dmg` from the [Releases](https://github.com/avanrossum/panoptisana/releases) page.

### Build from Source

```bash
git clone https://github.com/avanrossum/panoptisana.git
cd panoptisana
npm install
npm run dev
```

### Getting an Asana Personal Access Token

Panoptisana needs a Personal Access Token (PAT) — not an app client secret. To create one:

1. Go to the [Asana Developer Console](https://app.asana.com/0/my-apps)
2. Under **Personal access tokens**, click **Create new token**
3. Give it a name (e.g. "Panoptisana") and click **Create token**
4. Copy the token (it starts with `1/`) — you won't be able to see it again

The token is stored encrypted on your machine and is never sent anywhere except directly to Asana's API.

### Setup

1. Launch Panoptisana (it appears as a menu bar icon)
2. Click the gear icon or right-click the tray icon to open Settings
3. Paste your Personal Access Token and click **Verify**
4. Select yourself from the "I am" dropdown
5. Optionally check "Show only my tasks" or select specific users

## Development

```bash
npm run dev          # Dev mode (Vite HMR + Electron)
npm run build        # Production build
npm run pack         # Package without signing
npm run typecheck    # Type-check both main and renderer tsconfigs
npm run lint         # ESLint
npm test             # Run tests
npm run test:watch   # Tests in watch mode
```

## Development Methodology

Panoptisana is built using AI-assisted development with structured engineering practices. Every feature follows a full software development lifecycle: requirements are captured in a living roadmap, architecture decisions and lessons learned are documented in session context files, and a shared set of design standards (coding conventions, style guides, and testing standards) governs consistency across projects. AI tooling accelerates implementation, but the engineering rigor is human-driven: clear specifications, incremental commits, extracted and tested pure logic, CI/CD gates (lint + test on every push), and a release script that enforces quality checks before any build ships. The methodology treats AI as a collaborator operating within well-defined constraints, not as an autonomous agent — the standards, architecture documentation, and accumulated project memory are what make AI-assisted development effective at scale.

## Known Limitations

- **Single workspace only** — Panoptisana uses the first workspace returned by the Asana API. If your account belongs to multiple workspaces or organizations, only the first one is visible. Multi-workspace support is on the [roadmap](ROADMAP.md).

## Tech Stack

- **Electron 40** — Desktop framework
- **React 19** — UI components
- **TypeScript** — Strict mode, dual tsconfig (main + renderer)
- **Vite 7** — Build tooling
- **SQLite** — Local data persistence via better-sqlite3
- **Vitest** — Testing framework
- **ESLint** — Code quality
- **GitHub Actions** — CI (typecheck + lint + test on every push)
- **electron-updater** — Auto-update support

## License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

**Pre-v1 (current):** All features, including auto-updates and signed DMG releases, are included in the open-source distribution. Everything ships as-is under GPL-3.0.

**v1 and beyond:** If and when Panoptisana reaches v1, distribution may move to a split model — the core application remains open-source under GPL-3.0, while signed binaries, auto-updates, and managed distribution may be offered separately as a one-time purchase. The source code will always be available to build from. This is not a commitment to change the model — just a reservation of the option.

## Credits

Built by [MipYip](https://github.com/avanrossum).
