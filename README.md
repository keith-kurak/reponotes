# RepoNotes

A mobile notes app for iOS and Android that keeps your markdown notes in a GitHub repository.

## Start the dev server

```bash
bun install
bun start
```

Open the app in the development build (`NOTE-DEV`). If you do not have one, run the `Development builds` workflow:

```bash
npx eas-cli@latest workflow:run .eas/workflows/dev-builds.yaml
```

## Features

- Connect to a GitHub repo with a PAT
- Two-way sync with one Sync button: uploads local changes, then downloads changes from GitHub (including folders)
- Pull changes and deletions made outside the device
- Sync never overwrites notes with local changes
- Rendered markdown view (GitHub flavor: tables, task lists, code blocks) with enriched-markdown
- iOS: rich text editing with enriched-markdown when a note can be saved without changes; plain markdown otherwise (code blocks, tables, blockquotes)
- Android: plain markdown editing
- Markdown keyboard toolbar in plain mode (H1–H3, bullet, checkbox, inline code, code block)
- Markdown shortcuts in the rich editor (`# `, `- `, `1. `)
- Non-ASCII text and emoji
- Light and dark mode
- Works offline; changes upload when you are online
- Browse folders; add notes and folders (Android: floating button, iOS: + menu)
- Home lists every change to sync; status updates live on every screen
- Choose a version when a note changed on GitHub and on the device (conflict)
- Going back while editing saves the note
- Native UI on both platforms with Expo UI: lists, forms, sheets and buttons (SwiftUI on iOS, Jetpack Compose on Android), and native header toolbars
- Pin notes to Home
- Recently opened notes on Home

## TODO

- Live user testing of basic connection and editing features
- Ensure file deletion is working
- Rich editing for code blocks and blockquotes (block-based editor, or wait for [enriched-markdown#896](https://github.com/software-mansion/enriched-markdown/issues/896))
