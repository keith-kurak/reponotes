import { AppColors, useAppColors } from "@/constants/colors";
import { listLocalFiles } from "@/utils/fileSystem";
import { noteMetadata } from "@/utils/noteMetadata";
import { pendingChanges } from "@/utils/pendingChanges";
import { noteHref } from "@/utils/routes";
import { uploadAllPending, UploadAllResult } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function describeUploadResult(result: UploadAllResult): string {
  const lines: string[] = [];
  if (result.offline) {
    lines.push(
      "Cannot reach GitHub. Your changes are saved on this device. Tap Upload all again when you are online.",
    );
  }
  if (result.uploaded.length > 0 || !result.offline) {
    lines.push(`Uploaded ${result.uploaded.length} file(s).`);
  }
  if (result.conflicts.length > 0) {
    lines.push(
      `Changed on GitHub (open each note to choose a version): ${result.conflicts.join(", ")}.`,
    );
  }
  for (const failure of result.failed) {
    lines.push(`${failure.path}: ${failure.message}`);
  }
  return lines.join("\n");
}

export default function DashboardScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [pinnedFiles, setPinnedFiles] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);

  const loadData = () => {
    const files = listLocalFiles();
    const pinned = noteMetadata
      .getAllPinnedFiles()
      .filter((f) => files.includes(f));
    setPinnedFiles(pinned);
    // Show the 5 most recently opened files (excluding pinned ones)
    const nonPinnedFiles = files
      .filter((f) => !pinned.includes(f))
      .sort(
        (a, b) =>
          noteMetadata.getLastOpenedAt(b) - noteMetadata.getLastOpenedAt(a),
      );
    setRecentFiles(nonPinnedFiles.slice(0, 5));
    setPendingFiles(pendingChanges.getAll().filter((f) => files.includes(f)));
  };

  const uploadMutation = useMutation({
    mutationFn: uploadAllPending,
    onSettled: () => loadData(),
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView}>
        {pinnedFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pinned</Text>
            {pinnedFiles.map((file) => {
              const hasPending = pendingFiles.includes(file);
              return (
                <Link
                  key={file}
                  href={noteHref(file)}
                  asChild
                >
                  <TouchableOpacity
                    style={styles.pinnedItem}
                    accessibilityLabel={`Pinned: ${file}`}
                  >
                    <Ionicons name="pin" size={18} color={colors.tint} />
                    <Text style={styles.fileName}>{file}</Text>
                    {hasPending && <View style={styles.pendingDot} />}
                    <Ionicons name="chevron-forward" size={16} color={colors.iconMuted} />
                  </TouchableOpacity>
                </Link>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Files</Text>
          {recentFiles.length === 0 && pinnedFiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={colors.iconMuted} />
              <Text style={styles.emptyText}>No files yet</Text>
              <Text style={styles.emptyHint}>
                Go to Files tab to sync or create notes
              </Text>
            </View>
          ) : recentFiles.length === 0 ? (
            <Text style={styles.emptyHint}>No other recent files</Text>
          ) : (
            recentFiles.map((file) => {
              const hasPending = pendingFiles.includes(file);
              return (
                <Link
                  key={file}
                  href={noteHref(file)}
                  asChild
                >
                  <TouchableOpacity
                    style={styles.fileItem}
                    accessibilityLabel={file}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={colors.icon}
                    />
                    <Text style={styles.fileName}>{file}</Text>
                    {hasPending && <View style={styles.pendingDot} />}
                    <Ionicons name="chevron-forward" size={16} color={colors.iconMuted} />
                  </TouchableOpacity>
                </Link>
              );
            })
          )}
        </View>

        {(pendingFiles.length > 0 || uploadMutation.data || uploadMutation.error) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Changes</Text>
            {pendingFiles.length > 0 && (
              <TouchableOpacity
                style={styles.pendingCard}
                onPress={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={`Upload all: ${pendingFiles.length} file${pendingFiles.length !== 1 ? "s" : ""} with changes not on GitHub`}
              >
                {uploadMutation.isPending ? (
                  <ActivityIndicator color={colors.warningText} />
                ) : (
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={colors.pending}
                  />
                )}
                <Text style={styles.pendingCount}>
                  {pendingFiles.length} file
                  {pendingFiles.length !== 1 ? "s" : ""} with unsaved changes
                </Text>
                <Text style={styles.pendingAction}>Upload all</Text>
              </TouchableOpacity>
            )}
            {uploadMutation.data && (
              <Text style={styles.uploadResult}>
                {describeUploadResult(uploadMutation.data)}
              </Text>
            )}
            {uploadMutation.error && (
              <Text style={styles.uploadError}>
                {uploadMutation.error.message}
              </Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <Link href="/(tabs)/files" asChild>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="folder-outline" size={24} color={colors.tint} />
                <Text style={styles.actionText}>Browse Files</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/(tabs)/settings" asChild>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="settings-outline" size={24} color={colors.tint} />
                <Text style={styles.actionText}>Settings</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
      marginBottom: 12,
    },
    emptyState: {
      alignItems: "center",
      padding: 24,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "500",
      color: c.textTertiary,
      marginTop: 12,
    },
    emptyHint: {
      fontSize: 14,
      color: c.textMuted,
      marginTop: 4,
      textAlign: "center",
    },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: c.surface,
      borderRadius: 8,
      marginBottom: 8,
      gap: 10,
    },
    pinnedItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: c.surfacePinned,
      borderRadius: 8,
      marginBottom: 8,
      gap: 10,
    },
    fileName: {
      flex: 1,
      fontSize: 15,
      color: c.text,
    },
    pendingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.pending,
    },
    pendingCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: c.warningBackground,
      borderRadius: 8,
      gap: 12,
    },
    pendingCount: {
      flex: 1,
      fontSize: 15,
      color: c.warningText,
    },
    pendingAction: {
      fontSize: 15,
      fontWeight: "600",
      color: c.tint,
    },
    uploadResult: {
      fontSize: 14,
      color: c.textSecondary,
      marginTop: 8,
    },
    uploadError: {
      fontSize: 14,
      color: c.errorText,
      marginTop: 8,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      flex: 1,
      alignItems: "center",
      padding: 16,
      backgroundColor: c.surfaceAccent,
      borderRadius: 8,
      gap: 8,
    },
    actionText: {
      fontSize: 14,
      color: c.tint,
      fontWeight: "500",
    },
  });
}
