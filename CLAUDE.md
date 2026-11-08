# RepoNotes

A mobile notes app that syncs markdown files with a GitHub repository.

## Tech Stack

- **Framework**: Expo SDK 58 with Expo Router
- **Language**: TypeScript
- **UI**: React Native with Ionicons
- **State Management**: React Query for async operations, React useState for local state
- **Storage**: expo-sqlite/kv-store for local metadata (synchronous API)
- **File System**: expo-file-system for local note storage
- **Navigation**: expo-router with native tabs (`expo-router/native-tabs`)

## Project Structure

```
src/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigator screens
│   │   ├── _layout.tsx    # Tab layout with NativeTabs
│   │   ├── index.tsx      # Dashboard (pinned & recent files)
│   │   ├── files.tsx      # File list with sync
│   │   └── settings.tsx   # GitHub configuration
│   ├── note/
│   │   └── [...path].tsx  # Note viewer/editor (path keeps folders)
│   └── _layout.tsx        # Root layout with providers
├── components/            # Reusable components
│   └── Toast.tsx         # Auto-dismissing toast notifications
├── utils/                 # Utility modules
│   ├── fileSystem.ts     # Local file operations (expo-file-system)
│   ├── github.ts         # GitHub API operations
│   ├── noteMetadata.ts   # Per-file metadata storage
│   ├── pendingChanges.ts # Tracks unsaved changes (uses noteMetadata)
│   ├── routes.ts         # noteHref() link helper for notes
│   ├── storage.ts        # App settings storage
│   └── sync.ts           # Sync, upload, conflict resolution
├── hooks/                 # Custom React hooks
└── constants/            # App constants
```

## Key Patterns

### Storage

- **App settings** (GitHub PAT, repo name): `src/utils/storage.ts` using expo-sqlite/kv-store
- **Note metadata** (sha, isPinned, hasPendingChanges): `src/utils/noteMetadata.ts` - single key with per-file sub-objects
- **Note content**: Local files in expo-file-system document directory

### GitHub Sync

- Notes are identified by their repo path (e.g. `projects/plan.md`) everywhere: local files, metadata keys, and routes
- Sync logic lives in `src/utils/sync.ts`; screens do not call the GitHub API directly
- Sync skips notes with pending changes; a stale SHA on upload is a conflict that the user resolves
- Use `src/utils/base64.ts` for file content (UTF-8 safe); do not use `atob`/`btoa` directly
- Files are synced individually via GitHub Contents API
- SHA tracking for conflict-free updates
- New files created without SHA, existing files updated with SHA
- Sync button shows upload icon when pending changes, sync icon otherwise

### Navigation

- Uses `NativeTabs` from `expo-router/native-tabs` for native tab bar
- SF Symbols on iOS, Ionicons on Android via `ionicon` prop
- Note viewer is outside tabs (Stack screen)

## Commands

```bash
bun start          # Start Expo dev server
bun run ios        # Run on iOS simulator
bun run android    # Run on Android emulator
bun run lint       # Run ESLint
```

## Code Style

- Double quotes for strings (enforced by linter)
- Imports sorted alphabetically
- Components use function declarations
- Styles defined with StyleSheet.create at bottom of file

## App variants

`APP_VARIANT` selects the variant: unset = development (`NOTE-DEV`), `preview`, `production`.
EAS gets it from the EAS environment of the build profile. Do not add it to `eas.json`.
Runtime version policy: `appVersion`.

## Cloud simulator skills

- `eas-sim-dev`: run and drive the app on an iOS cloud simulator with Metro.
- `eas-sim-verify-pr-ios` / `eas-sim-verify-pr-android`: validate a PR and comment the result.
- `eas-sim-preview-link`: post an iOS web preview link on a PR.
- `apk-session-link`: build a preview APK and make an Android cloud emulator session link.

## README

Keep `README.md` in this order: description, start the dev server, Features (short bullets), TODO (next major goals).
When a change adds a feature or completes a goal, update Features and TODO in the same change.
