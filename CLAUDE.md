# RepoNotes

A mobile notes app that syncs markdown files with a GitHub repository.

## Tech Stack

- **Framework**: Expo SDK 58 with Expo Router
- **Language**: TypeScript
- **UI**: Expo UI (`@expo/ui`) universal components for lists, forms, sheets and buttons (SwiftUI on iOS, Jetpack Compose on Android); notes render with `react-native-enriched-markdown`
- **Colors**: use tokens from `src/constants/colors.ts` (`useAppColors`), not hex literals; light and dark mode
- **State Management**: React Query for async operations, React useState for local state
- **Storage**: expo-sqlite/kv-store for local metadata (synchronous API)
- **File System**: expo-file-system for local note storage
- **Navigation**: expo-router with native tabs (`expo-router/native-tabs`)

## Project Structure

```
src/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigator screens (each tab is a Stack)
│   │   ├── _layout.tsx    # Tab layout with NativeTabs (labels visible)
│   │   ├── (home)/        # Home: sync status, changes to sync, pinned, recent
│   │   ├── files/         # index.tsx (root) and [...folder].tsx use FolderView
│   │   └── settings/      # GitHub configuration
│   ├── note/
│   │   └── [...path].tsx  # Note viewer/editor (path keeps folders)
│   └── _layout.tsx        # Root layout with providers
├── components/            # Reusable components
│   ├── AddFab.android.tsx # Expo UI speed-dial FAB (new note / new folder)
│   ├── FolderView.tsx    # One folder in the Files tab
│   ├── MarkdownToolbar.tsx # Keyboard toolbar for the plain editor
│   ├── NoteEditor.tsx    # Hybrid rich/plain note editor with save checks
│   ├── NamePrompt.tsx    # Expo UI BottomSheet asking for a note/folder name
│   ├── SyncStatusRow.tsx # Live sync status as a native ListItem
│   └── Toast.tsx         # Auto-dismissing toast notifications
├── utils/                 # Utility modules
│   ├── fileSystem.ts     # Local file operations (expo-file-system)
│   ├── github.ts         # GitHub API operations
│   ├── markdownCommands.ts # Toolbar text commands (headings, lists, code)
│   ├── noteMetadata.ts   # Per-file metadata storage (sha, pending, conflict, pin)
│   ├── notesStore.ts     # Change notification for notes and metadata
│   ├── pendingChanges.ts # Tracks unsaved changes (uses noteMetadata)
│   ├── richEditorSafety.ts # Round-trip and literal-markup checks for the rich editor
│   ├── routes.ts         # noteHref() link helper for notes
│   ├── storage.ts        # App settings storage
│   ├── sync.ts           # syncNow (upload then download), conflict resolution
│   └── syncState.ts      # Shared sync status (syncing, last sync, last error)
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
- `syncNow()` is the only sync action: upload pending notes one at a time, then download; notes with local changes or conflicts are never overwritten
- A stale SHA on upload sets `hasConflict`; the note screen shows Keep mine / Use GitHub version
- New notes are pending at once, so an empty new note also uploads
- Screens read notes with `useNotesData(() => ...)`; it reads again after every change (`notesStore`). Do not use `useMemo` with a `void version` dependency: the React Compiler (on in app.json) removes it
- No per-note upload/download buttons; Home lists all pending changes
- Use `src/utils/base64.ts` for file content (UTF-8 safe); do not use `atob`/`btoa` directly
- Files are synced individually via GitHub Contents API
- SHA tracking for conflict-free updates
- New files created without SHA, existing files updated with SHA

### Note editor

- `NoteEditor` uses the enriched-markdown rich editor only when a hidden editor loads and writes the note back unchanged; otherwise it uses a plain markdown `TextInput`
- On save, the rich output must survive a second round trip, and the visible text must not contain literal markdown characters; if a check fails, nothing is saved and the editor switches to plain mode with a banner
- The Format menu hides Underline (`_x_` is italic in markdown) and Spoiler (`||x||` is not standard)
- The viewer uses `hardSoftBreaks` because the rich editor writes Enter as a single newline
- Android edits plain markdown only (`RICH_EDITING` in NoteEditor); the plain editor has `MarkdownToolbar`

### Native UI (Expo UI)

- Prefer `@expo/ui` universal components (`Host`, `List`, `List.ForEach`, `ListItem`, `FieldGroup`, `TextInput`, `Button`, `BottomSheet`, `Icon`) over React Native views
- Files: `List` + `List.ForEach` (`onRefresh` syncs); Home and Settings: `FieldGroup` sections
- `TextInput` from `@expo/ui` keeps its value in `useNativeState`; read it with `.get()` in handlers. Do not update React state from its `onChangeText` (it can run on the UI thread)
- Row icons come from `src/constants/listIcons.ts` (`Icon.select`: SF Symbol on iOS, XML drawable in `assets/icons` on Android); give leading icons `style={{ width: 28 }}` so names line up
- Still React Native on purpose: the markdown viewer/editors (enriched-markdown), the plain editor (needs the selection API for the toolbar), the keyboard toolbar, the toast

### Navigation

- Uses `NativeTabs` from `expo-router/native-tabs` for native tab bar
- SF Symbols on iOS, vector icons on Android
- Header buttons use `Stack.Toolbar` on both platforms; icons come from `src/constants/toolbarIcons.ts` (SF Symbols on iOS, Material XML drawables in `assets/icons` on Android)
- Android-only Expo UI (Jetpack Compose) code lives in `*.android.tsx` files in `components/`
- Note viewer is outside tabs (root Stack screen)

## Commands

```bash
bun start          # Start Expo dev server
bun run ios        # Run on iOS simulator
bun run android    # Run on Android emulator
bun run lint       # Run ESLint
bun run test       # Run unit tests (bun test, src/**/__tests__)
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
