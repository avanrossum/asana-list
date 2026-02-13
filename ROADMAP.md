# Panorasana - Roadmap

## Project Overview

Open-source Asana task and project visibility tool for macOS. Displays a searchable list of incomplete tasks and active projects with comment tracking and auto-updates.

## Current Version: 0.1.0

### Core Features (v0.1.0)
- [x] Searchable task list with sorting
- [x] Searchable project list
- [x] Comment toggling with new comment highlighting
- [x] Settings: API key management (encrypted at rest)
- [x] Settings: User selection ("I am" + "show only my tasks")
- [x] Settings: Polling interval
- [x] Settings: Exclusion lists (tasks + projects)
- [x] Settings: Theme (dark/light/system) + accent colors
- [x] Settings: Global hotkey (Ctrl+Shift+A)
- [x] Tray-only app (hidden from Dock/Cmd+Tab)
- [x] Auto-update via GitHub releases
- [x] Copy GID / Open Task buttons

## Feature Backlog

### High Priority
- [ ] Task count badges in tray menu
- [ ] Notification for new comments
- [ ] Keyboard navigation in task list
- [ ] Task subtask display

### Medium Priority
- [ ] Custom sort persistence
- [ ] Task grouping (by project, by assignee, by section)
- [ ] Quick-add comment from within app
- [ ] Project status display
- [ ] Search history

### Low Priority
- [ ] Multiple workspace support
- [ ] Custom fields display
- [ ] Export task list
- [ ] Window position memory per display

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron 40 |
| UI | React 19 |
| Build | Vite 7 |
| Packaging | electron-builder |
| Auto-update | electron-updater |
| Language | JavaScript (ES Modules in renderer, CJS in main) |

## Gotchas

- Asana search API has rate limits; polling interval should be >= 1 minute
- Template images for tray must be black-on-transparent PNG
- `app.dock.hide()` must be called before window creation
- Global hotkey registration can fail silently if another app holds it
