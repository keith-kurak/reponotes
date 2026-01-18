import { listLocalFiles, writeLocalFile } from "@/utils/fileSystem";
import { fetchFileContentWithSha, listMarkdownFiles } from "@/utils/github";
import { fileSha, pendingChanges } from "@/utils/pendingChanges";
import { storage } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function FileListScreen() {
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);

  const loadLocalFiles = async () => {
    const files = listLocalFiles();
    setLocalFiles(files);
    const pending = await pendingChanges.getAll();
    setPendingFiles(pending);
  };

  useEffect(() => {
    loadLocalFiles();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLocalFiles();
    }, []),
  );

  const syncMutation = useMutation({
    mutationFn: async () => {
      const [token, repoName, owner] = await Promise.all([
        storage.getGitHubPAT(),
        storage.getRepoName(),
        storage.getGitHubOwner(),
      ]);

      if (!token) {
        throw new Error(
          "GitHub PAT not configured. Please configure in Settings.",
        );
      }
      if (!owner) {
        throw new Error(
          "GitHub owner not configured. Please configure in Settings.",
        );
      }

      const files = await listMarkdownFiles(token, repoName, owner);

      await Promise.all(
        files.map(async (file) => {
          const result = await fetchFileContentWithSha(
            token,
            repoName,
            owner,
            file.path,
          );
          writeLocalFile(file.name, result.content);
          await fileSha.set(file.name, result.sha);
        }),
      );

      await loadLocalFiles();
    },
  });

  const renderItem = ({ item }: { item: string }) => {
    const hasPending = pendingFiles.includes(item);
    return (
      <Link href={`/note/${encodeURIComponent(item)}`} asChild>
        <TouchableOpacity style={styles.fileItem}>
          <Ionicons name="document-text-outline" size={24} color="#666" />
          <Text style={styles.fileName}>{item}</Text>
          {hasPending && <View style={styles.pendingDot} />}
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="sync-outline" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => router.push("/settings")}
        >
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {syncMutation.isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {syncMutation.error instanceof Error
              ? syncMutation.error.message
              : "Failed to sync files"}
          </Text>
        </View>
      )}

      {syncMutation.isSuccess && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Files synced successfully!</Text>
        </View>
      )}

      {localFiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptyHint}>
            Tap the sync button to download notes from GitHub
          </Text>
        </View>
      ) : (
        <FlatList
          data={localFiles}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 12,
  },
  toolbarButton: {
    padding: 8,
  },
  list: {
    flex: 1,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFC107",
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 8,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: "#ffebee",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f44336",
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
  },
  successBox: {
    backgroundColor: "#e8f5e9",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4caf50",
  },
  successText: {
    color: "#2e7d32",
    fontSize: 14,
  },
});
