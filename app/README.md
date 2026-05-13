# Notable Modern

A modern, markdown-first note-taking app inspired by [Notable](https://github.com/notable/notable) v1.5.1, rebuilt from scratch on a 2026 stack.

> Status: **Phase 1 (scaffold + core)**. Usable for plain markdown note-taking. See [Roadmap](#roadmap) for what's coming.

## Why this exists

Notable v1.5.1 was a great markdown note-taker. The current source is closed; the last open release (May 2019) no longer builds on modern toolchains. This is a from-scratch rewrite that keeps the parts users actually loved (file-based markdown, attachments rendered inline, tags, no vendor lock-in) on a stack that builds and runs today.

## Stack

| Layer        | Choice                                |
|--------------|---------------------------------------|
| Wrapper      | Electron 31                           |
| Bundler      | electron-vite                         |
| UI           | React 18 + TypeScript                 |
| Styles       | Tailwind 3                            |
| Editor       | Monaco 0.50 (same as VS Code)         |
| Markdown     | markdown-it + KaTeX + Mermaid + Prism |
| State        | Zustand                               |
| Search       | Fuse.js                               |
| File watcher | chokidar                              |
| Frontmatter  | gray-matter                           |

## Storage model (same as Notable)

```
your-notes-folder/
├── notes/
│   ├── My note.md           ← YAML frontmatter + markdown body
│   └── …
├── attachments/
│   ├── screenshot.png
│   └── …
└── .trash/                  ← soft-deleted notes
```

Each note is a plain `.md` file:

```md
---
title: My note
tags: [Work, Ideas]
created: 2026-05-13T12:00:00.000Z
modified: 2026-05-13T13:00:00.000Z
favorited: true
---

# Hello

Inline image attachments render natively (no patch needed):

[screenshot.png](@attachment/screenshot.png)
```

The renderer auto-rewrites `@attachment/<file>` URLs through a custom `attachment://` protocol that resolves to the workspace's `attachments/` dir.

## Develop

```sh
cd app
npm install
npm run dev          # launches Electron with HMR
```

## Build for production

```sh
npm run build        # bundles to ./out
npm run package:mac  # creates a .dmg in ./release
```

## Roadmap

- **Phase 1 — scaffold + core (this commit)**
  - [x] Workspace picker + persistent settings
  - [x] Sidebar (All Notes / Favorites / Trash / Tags)
  - [x] Note list with search and sort
  - [x] Monaco editor + split markdown preview
  - [x] Inline attachment rendering for images
  - [x] File watcher (external edits reflect in the app)
  - [x] Light / dark / system theme
  - [x] KaTeX inline + block math
  - [x] Mermaid diagrams (post-rendered)
  - [x] Prism syntax highlighting
  - [x] Task lists, tables, anchors
- **Phase 2 — usability**
  - [ ] Multi-cursor / column selection ergonomics
  - [ ] Tag autocompletion + tree view of nested tags
  - [ ] Recent files / quick switcher (Cmd-P)
  - [ ] Attachment manager modal
  - [ ] Better trash UX (restore in place, empty trash)
  - [ ] Export to PDF (the IPC is wired; just needs print stylesheet)
- **Phase 3 — feature parity**
  - [ ] ENEX (Evernote) import
  - [ ] Multi-window
  - [ ] Settings UI
  - [ ] First-run tutorial
  - [ ] Auto-updater
  - [ ] Code-signed builds for macOS / Windows

## License

AGPL-3.0-or-later (same as Notable v1.5.1).
