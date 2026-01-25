# RepoNotes

A mobile notes app that syncs markdown files with a GitHub repository.

## Tech Stack

- **Framework**: Expo SDK 55 (canary) with Expo Router
- **Language**: TypeScript
- **UI**: React Native with Ionicons
- **State Management**: React Query for async operations, React useState for local state
- **Storage**: expo-sqlite/kv-store for local metadata (synchronous API)
- **File System**: expo-file-system for local note storage
- **Navigation**: expo-router with native tabs (`expo-router/unstable-native-tabs`)

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
│   │   └── [filename].tsx # Note viewer/editor
│   └── _layout.tsx        # Root layout with providers
├── components/            # Reusable components
│   └── Toast.tsx         # Auto-dismissing toast notifications
├── utils/                 # Utility modules
│   ├── fileSystem.ts     # Local file operations (expo-file-system)
│   ├── github.ts         # GitHub API operations
│   ├── noteMetadata.ts   # Per-file metadata storage
│   ├── pendingChanges.ts # Tracks unsaved changes (uses noteMetadata)
│   └── storage.ts        # App settings storage
├── hooks/                 # Custom React hooks
└── constants/            # App constants
```

## Key Patterns

### Storage

- **App settings** (GitHub PAT, repo name): `src/utils/storage.ts` using expo-sqlite/kv-store
- **Note metadata** (sha, isPinned, hasPendingChanges): `src/utils/noteMetadata.ts` - single key with per-file sub-objects
- **Note content**: Local files in expo-file-system document directory

### GitHub Sync

- Files are synced individually via GitHub Contents API
- SHA tracking for conflict-free updates
- New files created without SHA, existing files updated with SHA
- Sync button shows upload icon when pending changes, sync icon otherwise

### Navigation

- Uses `NativeTabs` from `expo-router/unstable-native-tabs` for native tab bar
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
