# Changelog

All notable changes to Panorasana will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-13

### Added
- "Only my projects" filter checkbox on the Projects tab
- Inclusion filter lists for tasks and projects (show only items matching a pattern)
- Right-click context menu on tasks and projects: "Exclude" and "Copy GID"
- Project membership data fetched from Asana API (`members.gid`)

### Fixed
- "Show only my tasks" now correctly filters to directly-assigned tasks only (Asana search API was returning collaborator/follower tasks)
- `currentUserId` was not being read from settings (typo: `iAmUserId` → `currentUserId`), breaking comment highlight suppression

## [0.1.0] - 2026-02-13

### Added
- Initial release
- Searchable task list with sort by modified, due date, name, assignee, created
- Searchable project list with color dots
- Task comment toggling with new-comment highlighting
- Settings window with API key management (AES-256-GCM encrypted at rest)
- User selection: "I am" dropdown, "show only my tasks" checkbox, multi-user selection
- Configurable polling interval (1-60 minutes)
- Exclusion lists for tasks and projects (GID or name pattern)
- Theme support: dark, light, system (7 accent colors)
- Global hotkey: Ctrl+Shift+A to show/hide
- System tray icon with context menu
- Hidden from Dock and Cmd+Tab
- Auto-update via GitHub releases
- Copy GID and Open Task/Project buttons on each item
- Single-instance enforcement
