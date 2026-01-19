import { listLocalFiles } from "@/utils/fileSystem";
import { noteMetadata } from "@/utils/noteMetadata";
import { pendingChanges } from "@/utils/pendingChanges";
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardScreen() {
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [pinnedFiles, setPinnedFiles] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);

  const loadData = () => {
    const files = listLocalFiles();
    const pinned = noteMetadata
      .getAllPinnedFiles()
      .filter((f) => files.includes(f));
    setPinnedFiles(pinned);
    // Show the 5 most recent files (excluding pinned ones)
    const nonPinnedFiles = files.filter((f) => !pinned.includes(f));
    setRecentFiles(nonPinnedFiles.slice(0, 5));
    const pending = pendingChanges.getAll();
    setPendingFiles(pending);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        {pinnedFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pinned</Text>
            {pinnedFiles.map((file) => {
              const hasPending = pendingFiles.includes(file);
              return (
                <Link
                  key={file}
                  href={`/note/${encodeURIComponent(file)}`}
                  asChild
                >
                  <TouchableOpacity style={styles.pinnedItem}>
                    <Ionicons name="pin" size={18} color="#007AFF" />
                    <Text style={styles.fileName}>{file}</Text>
                    {hasPending && <View style={styles.pendingDot} />}
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
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
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
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
                  href={`/note/${encodeURIComponent(file)}`}
                  asChild
                >
                  <TouchableOpacity style={styles.fileItem}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#666"
                    />
                    <Text style={styles.fileName}>{file}</Text>
                    {hasPending && <View style={styles.pendingDot} />}
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                  </TouchableOpacity>
                </Link>
              );
            })
          )}
        </View>

        {pendingFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Changes</Text>
            <View style={styles.pendingCard}>
              <Ionicons name="cloud-upload-outline" size={24} color="#FFC107" />
              <Text style={styles.pendingCount}>
                {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""}{" "}
                with unsaved changes
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <Link href="/(tabs)/files" asChild>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="folder-outline" size={24} color="#007AFF" />
                <Text style={styles.actionText}>Browse Files</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/(tabs)/settings" asChild>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="settings-outline" size={24} color="#007AFF" />
                <Text style={styles.actionText}>Settings</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#999",
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 4,
    textAlign: "center",
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  pinnedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFC107",
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    gap: 12,
  },
  pendingCount: {
    fontSize: 15,
    color: "#F57C00",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
});
