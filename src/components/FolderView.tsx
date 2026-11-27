import { AddFab } from "@/components/AddFab";
import { NamePrompt } from "@/components/NamePrompt";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { AppColors, useAppColors } from "@/constants/colors";
import { toolbarIcons } from "@/constants/toolbarIcons";
import { useNotesData } from "@/hooks/use-notes-version";
import { usePendingNotes } from "@/hooks/use-pending-notes";
import { useSyncStatus } from "@/hooks/use-sync-status";
import {
  createLocalFolder,
  getFileName,
  listFolder,
  localFileExists,
  localFolderExists,
  normalizeNotePath,
  writeLocalFile,
} from "@/utils/fileSystem";
import { pendingChanges } from "@/utils/pendingChanges";
import { folderHref, noteHref } from "@/utils/routes";
import { syncNow } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Row = { kind: "folder" | "note"; path: string };

function joinPath(folder: string, name: string): string {
  return normalizeNotePath(folder ? `${folder}/${name}` : name);
}

/** Lists one folder: subfolders first, then notes. */
export function FolderView({ folderPath }: { folderPath: string }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { notes: pendingNotes } = usePendingNotes();
  const { isSyncing } = useSyncStatus();
  const [prompt, setPrompt] = useState<"note" | "folder" | null>(null);

  const rows = useNotesData<Row[]>(() => {
    const contents = listFolder(folderPath);
    return [
      ...contents.folders.map((path) => ({ kind: "folder" as const, path })),
      ...contents.files.map((path) => ({ kind: "note" as const, path })),
    ];
  });

  const pendingState = useMemo(
    () => new Map(pendingNotes.map((note) => [note.path, note.state])),
    [pendingNotes],
  );

  const createNote = (name: string): string | null => {
    let path = joinPath(folderPath, name);
    if (!path) return "Enter a name.";
    if (!getFileName(path).includes(".")) path = `${path}.md`;
    if (!path.endsWith(".md") && !path.endsWith(".txt")) {
      return "Use a .md or .txt file name.";
    }
    if (localFileExists(path)) return "A note with this name already exists.";
    writeLocalFile(path, "");
    // A new note is a change to sync, even while it is empty.
    pendingChanges.add(path);
    setPrompt(null);
    router.push(noteHref(path));
    return null;
  };

  const createFolder = (name: string): string | null => {
    const path = joinPath(folderPath, name);
    if (!path) return "Enter a name.";
    if (localFolderExists(path))
      return "A folder with this name already exists.";
    createLocalFolder(path);
    setPrompt(null);
    router.push(folderHref(path));
    return null;
  };

  const renderItem = ({ item }: { item: Row }) => {
    const name = getFileName(item.path);
    if (item.kind === "folder") {
      return (
        <Link href={folderHref(item.path)} asChild>
          <TouchableOpacity
            style={styles.row}
            accessibilityLabel={`Folder ${name}`}
          >
            <Ionicons name="folder-outline" size={24} color={colors.tint} />
            <Text style={styles.name}>{name}</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.iconMuted}
            />
          </TouchableOpacity>
        </Link>
      );
    }
    const state = pendingState.get(item.path);
    return (
      <Link href={noteHref(item.path)} asChild>
        <TouchableOpacity
          style={styles.row}
          accessibilityLabel={
            state === "conflict"
              ? `${name}, conflict`
              : state
                ? `${name}, not synced`
                : name
          }
        >
          <Ionicons
            name="document-text-outline"
            size={24}
            color={colors.icon}
          />
          <Text style={styles.name}>{name}</Text>
          {state === "conflict" ? (
            <Text style={styles.conflict}>Conflict</Text>
          ) : state ? (
            <View style={styles.pendingDot} />
          ) : null}
          <Ionicons name="chevron-forward" size={20} color={colors.iconMuted} />
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{ title: folderPath ? getFileName(folderPath) : "Files" }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcons.sync}
          accessibilityLabel="Sync with GitHub"
          disabled={isSyncing}
          onPress={() => void syncNow()}
        />
        {Platform.OS === "ios" && (
          <Stack.Toolbar.Menu icon={toolbarIcons.add} accessibilityLabel="Add">
            <Stack.Toolbar.MenuAction
              icon={toolbarIcons.newNote}
              onPress={() => setPrompt("note")}
            >
              New note
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon={toolbarIcons.newFolder}
              onPress={() => setPrompt("folder")}
            >
              New folder
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        )}
      </Stack.Toolbar>

      <FlatList
        style={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(item) => `${item.kind}:${item.path}`}
        renderItem={renderItem}
        ListHeaderComponent={<SyncStatusBar />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="folder-open-outline"
              size={56}
              color={colors.iconMuted}
            />
            <Text style={styles.emptyTitle}>
              {folderPath ? "This folder is empty" : "No notes yet"}
            </Text>
            <Text style={styles.emptyHint}>
              {folderPath
                ? "GitHub saves a folder only when it has a note. Add a note to keep it."
                : "Sync to download notes from GitHub, or add a note."}
            </Text>
          </View>
        }
        refreshing={false}
        onRefresh={() => void syncNow()}
        contentContainerStyle={styles.listContent}
      />

      <AddFab
        onNewNote={() => setPrompt("note")}
        onNewFolder={() => setPrompt("folder")}
      />

      <NamePrompt
        visible={prompt === "note"}
        title="New note"
        placeholder="name"
        hint=".md is added if there is no extension."
        confirmLabel="Create"
        onSubmit={createNote}
        onCancel={() => setPrompt(null)}
      />
      <NamePrompt
        visible={prompt === "folder"}
        title="New folder"
        placeholder="name"
        hint="Use / to make nested folders."
        confirmLabel="Create"
        onSubmit={createFolder}
        onCancel={() => setPrompt(null)}
      />
    </>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    list: {
      flex: 1,
      backgroundColor: c.background,
    },
    listContent: {
      // Room for the Android floating action button.
      paddingBottom: Platform.OS === "android" ? 96 : 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      gap: 12,
    },
    name: {
      flex: 1,
      fontSize: 16,
      color: c.text,
    },
    pendingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.pending,
    },
    conflict: {
      fontSize: 12,
      fontWeight: "600",
      color: c.errorText,
    },
    empty: {
      alignItems: "center",
      padding: 32,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: c.textTertiary,
    },
    emptyHint: {
      fontSize: 14,
      color: c.textTertiary,
      textAlign: "center",
    },
  });
}
