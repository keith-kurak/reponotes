import { AppHost } from "@/components/AppHost";
import { SyncStatusRow } from "@/components/SyncStatusRow";
import { useAppColors } from "@/constants/colors";
import { listIcons } from "@/constants/listIcons";
import { toolbarIcons } from "@/constants/toolbarIcons";
import { useNotesData } from "@/hooks/use-notes-version";
import { PendingState, usePendingNotes } from "@/hooks/use-pending-notes";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { listLocalFiles } from "@/utils/fileSystem";
import { noteMetadata } from "@/utils/noteMetadata";
import { noteHref } from "@/utils/routes";
import { syncNow } from "@/utils/sync";
import { FieldGroup, Icon, ListItem, Text } from "@expo/ui";
import { router, Stack } from "expo-router";

const STATE_LABEL: Record<PendingState, string> = {
  conflict: "Conflict",
  new: "New",
  edited: "Edited",
};

export default function HomeScreen() {
  const colors = useAppColors();
  const { notes: pendingNotes, conflicts } = usePendingNotes();
  const { isSyncing } = useSyncStatus();

  const { pinned, recent } = useNotesData(() => {
    const files = listLocalFiles();
    const pinnedFiles = noteMetadata
      .getAllPinnedFiles()
      .filter((f) => files.includes(f))
      .sort();
    const recentFiles = files
      .filter((f) => !pinnedFiles.includes(f))
      .sort(
        (a, b) =>
          noteMetadata.getLastOpenedAt(b) - noteMetadata.getLastOpenedAt(a),
      )
      .slice(0, 5);
    return { pinned: pinnedFiles, recent: recentFiles };
  });

  const noteRow = (
    path: string,
    options: { icon?: "pin"; trailing?: string; trailingColor?: string } = {},
  ) => (
    <ListItem
      key={path}
      onPress={() => router.push(noteHref(path))}
      colors={{ containerColor: "transparent" }}
    >
      <ListItem.Leading>
        <Icon
          name={options.icon === "pin" ? listIcons.pin : listIcons.note}
          size={20}
          style={{ width: 28 }}
          color={options.icon === "pin" ? colors.tint : colors.icon}
        />
      </ListItem.Leading>
      <Text textStyle={{ color: colors.text }} numberOfLines={1}>
        {path}
      </Text>
      {options.trailing ? (
        <ListItem.Trailing>
          <Text textStyle={{ fontSize: 13, color: options.trailingColor }}>
            {options.trailing}
          </Text>
        </ListItem.Trailing>
      ) : null}
    </ListItem>
  );

  return (
    <>
      <Stack.Screen options={{ title: "Home" }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcons.sync}
          accessibilityLabel="Sync with GitHub"
          disabled={isSyncing}
          onPress={() => void syncNow()}
        />
      </Stack.Toolbar>

      <AppHost style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            <SyncStatusRow inFieldGroup />
          </FieldGroup.Section>

          {pendingNotes.length > 0 && (
            <FieldGroup.Section title="Changes to sync">
              {pendingNotes.map((note) =>
                noteRow(note.path, {
                  trailing: STATE_LABEL[note.state],
                  trailingColor:
                    note.state === "conflict"
                      ? colors.errorText
                      : colors.warningText,
                }),
              )}
              {conflicts > 0 && (
                <FieldGroup.SectionFooter>
                  <Text
                    textStyle={{ fontSize: 13, color: colors.textTertiary }}
                  >
                    A conflict means the note changed on GitHub and here. Open
                    it to choose which version to keep.
                  </Text>
                </FieldGroup.SectionFooter>
              )}
            </FieldGroup.Section>
          )}

          {pinned.length > 0 && (
            <FieldGroup.Section title="Pinned">
              {pinned.map((path) => noteRow(path, { icon: "pin" }))}
            </FieldGroup.Section>
          )}

          <FieldGroup.Section title="Recent">
            {recent.length === 0 && pinned.length === 0 ? (
              <ListItem>
                <Text textStyle={{ color: colors.textTertiary }}>
                  No notes yet. Sync to download notes, or add one in Files.
                </Text>
              </ListItem>
            ) : (
              recent.map((path) => noteRow(path))
            )}
          </FieldGroup.Section>
        </FieldGroup>
      </AppHost>
    </>
  );
}
