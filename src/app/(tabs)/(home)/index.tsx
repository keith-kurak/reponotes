import { SyncStatusBar } from "@/components/SyncStatusBar";
import { AppColors, useAppColors } from "@/constants/colors";
import { toolbarIcons } from "@/constants/toolbarIcons";
import { useNotesData } from "@/hooks/use-notes-version";
import { PendingState, usePendingNotes } from "@/hooks/use-pending-notes";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { listLocalFiles } from "@/utils/fileSystem";
import { noteMetadata } from "@/utils/noteMetadata";
import { noteHref } from "@/utils/routes";
import { syncNow } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STATE_LABEL: Record<PendingState, string> = {
  conflict: "Conflict",
  new: "New",
  edited: "Edited",
};

export default function HomeScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  const noteRow = (path: string, trailing?: React.ReactNode, icon?: "pin") => (
    <Link key={path} href={noteHref(path)} asChild>
      <TouchableOpacity style={styles.row} accessibilityLabel={path}>
        <Ionicons
          name={icon === "pin" ? "pin" : "document-text-outline"}
          size={20}
          color={icon === "pin" ? colors.tint : colors.icon}
        />
        <Text style={styles.rowText} numberOfLines={1}>
          {path}
        </Text>
        {trailing}
        <Ionicons name="chevron-forward" size={16} color={colors.iconMuted} />
      </TouchableOpacity>
    </Link>
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

      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void syncNow()} />
        }
      >
        <SyncStatusBar />

        {pendingNotes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Changes to sync</Text>
            {pendingNotes.map((note) =>
              noteRow(
                note.path,
                <Text
                  style={[
                    styles.badge,
                    note.state === "conflict" && styles.badgeConflict,
                  ]}
                >
                  {STATE_LABEL[note.state]}
                </Text>,
              ),
            )}
            {conflicts > 0 && (
              <Text style={styles.hint}>
                A conflict means the note changed on GitHub and here. Open it to
                choose which version to keep.
              </Text>
            )}
          </View>
        )}

        {pinned.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pinned</Text>
            {pinned.map((path) => noteRow(path, undefined, "pin"))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {recent.length === 0 && pinned.length === 0 ? (
            <Text style={styles.hint}>
              No notes yet. Sync to download notes, or add one in Files.
            </Text>
          ) : (
            recent.map((path) => noteRow(path))
          )}
        </View>
      </ScrollView>
    </>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    section: {
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
      marginBottom: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: c.surface,
      borderRadius: 8,
      gap: 10,
    },
    rowText: {
      flex: 1,
      fontSize: 15,
      color: c.text,
    },
    badge: {
      fontSize: 12,
      fontWeight: "600",
      color: c.warningText,
    },
    badgeConflict: {
      color: c.errorText,
    },
    hint: {
      fontSize: 13,
      color: c.textTertiary,
    },
  });
}
