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
- Sync markdown files with GitHub
- View and edit notes
- Track unsynced changes per note
- Pin notes to the dashboard
- Recent files on the dashboard

## TODO

- Live user testing of basic connection and editing features
- Ensure file deletion is working
- Ensure folders can be created
- Pull changes made outside the device from the repo
- Switch to [enriched-markdown](https://github.com/software-mansion/enriched-markdown) for editing
