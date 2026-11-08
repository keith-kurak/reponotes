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
- Sync markdown files with GitHub, including folders
- Pull changes and deletions made outside the device
- Sync never overwrites notes with local changes
- Rendered markdown view (GitHub flavor: tables, task lists, code blocks) with enriched-markdown
- Edit notes as plain markdown, including non-ASCII text and emoji
- Light and dark mode
- Works offline; changes upload when you are online
- Create notes in folders (`folder/name`)
- Track unsynced changes per note, and upload all from the dashboard
- Choose a version when a note changed on GitHub (conflict)
- Pin notes to the dashboard
- Recently opened files on the dashboard

## TODO

- Live user testing of basic connection and editing features
- Ensure file deletion is working
- Switch the editor to [enriched-markdown](https://github.com/software-mansion/enriched-markdown) (viewer done)
