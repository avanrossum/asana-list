# Changelog

All notable changes to Panorasana will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
