import { AppHost } from "@/components/AppHost";
import { AddFab } from "@/components/AddFab";
import { NamePrompt } from "@/components/NamePrompt";
import { SyncStatusRow } from "@/components/SyncStatusRow";
import { useAppColors } from "@/constants/colors";
import { listIcons } from "@/constants/listIcons";
import { toolbarIcons } from "@/constants/toolbarIcons";
import { useNotesData } from "@/hooks/use-notes-version";
import { PendingState, usePendingNotes } from "@/hooks/use-pending-notes";
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
import { Icon, List, ListItem, Text } from "@expo/ui";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Platform } from "react-native";

const STATE_LABEL: Record<PendingState, string> = {
  conflict: "Conflict",
  new: "Not synced",
  edited: "Not synced",
};

type Row = { kind: "folder" | "note"; path: string };

function joinPath(folder: string, name: string): string {
  return normalizeNotePath(folder ? `${folder}/${name}` : name);
}

/** Lists one folder: subfolders first, then notes. */
export function FolderView({ folderPath }: { folderPath: string }) {
  const colors = useAppColors();
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

  const open = (row: Row) =>
    router.push(
      row.kind === "folder" ? folderHref(row.path) : noteHref(row.path),
    );

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

      <AppHost style={{ flex: 1 }}>
        <List
          onRefresh={async () => {
            await syncNow();
          }}
        >
          <SyncStatusRow />
          {rows.length === 0 ? (
            <ListItem
              supportingText={
                folderPath
                  ? "GitHub saves a folder only when it has a note. Add a note to keep it."
                  : "Sync to download notes from GitHub, or add a note."
              }
            >
              <Text textStyle={{ color: colors.textSecondary }}>
                {folderPath ? "This folder is empty" : "No notes yet"}
              </Text>
            </ListItem>
          ) : (
            <List.ForEach
              data={rows}
              keyExtractor={(row) => `${row.kind}:${row.path}`}
            >
              {({ item }) => {
                const state = pendingState.get(item.path);
                return (
                  <ListItem onPress={() => open(item)}>
                    <ListItem.Leading>
                      <Icon
                        name={
                          item.kind === "folder"
                            ? listIcons.folder
                            : listIcons.note
                        }
                        size={22}
                        // Same width for every symbol, so the names line up.
                        style={{ width: 28 }}
                        color={
                          item.kind === "folder" ? colors.tint : colors.icon
                        }
                        accessibilityLabel={
                          item.kind === "folder" ? "Folder" : "Note"
                        }
                      />
                    </ListItem.Leading>
                    <Text textStyle={{ color: colors.text }}>
                      {getFileName(item.path)}
                    </Text>
                    {item.kind === "folder" && Platform.OS === "ios" ? (
                      // iOS shows a disclosure chevron on rows that open a list.
                      <ListItem.Trailing>
                        <Icon
                          name="chevron.right"
                          size={13}
                          color={colors.textTertiary}
                        />
                      </ListItem.Trailing>
                    ) : state ? (
                      <ListItem.Trailing>
                        <Text
                          textStyle={{
                            fontSize: 13,
                            color:
                              state === "conflict"
                                ? colors.errorText
                                : colors.warningText,
                          }}
                        >
                          {STATE_LABEL[state]}
                        </Text>
                      </ListItem.Trailing>
                    ) : null}
                  </ListItem>
                );
              }}
            </List.ForEach>
          )}
        </List>

        <NamePrompt
          visible={prompt === "note"}
          title="New note"
          placeholder="Name"
          hint=".md is added if there is no extension."
          confirmLabel="Create"
          onSubmit={createNote}
          onCancel={() => setPrompt(null)}
        />
        <NamePrompt
          visible={prompt === "folder"}
          title="New folder"
          placeholder="Name"
          hint="Use / to make nested folders."
          confirmLabel="Create"
          onSubmit={createFolder}
          onCancel={() => setPrompt(null)}
        />
      </AppHost>

      <AddFab
        onNewNote={() => setPrompt("note")}
        onNewFolder={() => setPrompt("folder")}
      />
    </>
  );
}
