import {
  getFileName,
  getFolderPath,
  listLocalFiles,
  localFileExists,
  normalizeNotePath,
  writeLocalFile,
} from "@/utils/fileSystem";
import { pendingChanges } from "@/utils/pendingChanges";
import { noteHref } from "@/utils/routes";
import { syncAllFromGitHub, SyncResult } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Link, router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function describeSyncResult(result: SyncResult): string {
  const parts = [
    result.downloaded === 1
      ? "1 note downloaded"
      : `${result.downloaded} notes downloaded`,
  ];
  if (result.deleted.length > 0) {
    parts.push(`${result.deleted.length} removed (deleted on GitHub)`);
  }
  let message = `Synced: ${parts.join(", ")}.`;
  if (result.skippedPending.length > 0) {
    message += ` Not changed because they have local edits: ${result.skippedPending.join(", ")}.`;
  }
  return message;
}

export default function FileListScreen() {
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileError, setNewFileError] = useState<string | null>(null);

  const loadLocalFiles = () => {
    setLocalFiles(listLocalFiles());
    setPendingFiles(pendingChanges.getAll());
  };

  useFocusEffect(
    useCallback(() => {
      loadLocalFiles();
    }, []),
  );

  const closeNewFileModal = () => {
    setShowNewFileModal(false);
    setNewFileName("");
    setNewFileError(null);
  };

  const handleCreateFile = () => {
    let path = normalizeNotePath(newFileName);
    if (!path) {
      setNewFileError("Enter a file name.");
      return;
    }

    // Add .md extension if no extension is provided
    if (!getFileName(path).includes(".")) {
      path = `${path}.md`;
    }
    if (!path.endsWith(".md") && !path.endsWith(".txt")) {
      setNewFileError("Use a .md or .txt file name.");
      return;
    }
    if (localFileExists(path)) {
      setNewFileError("A note with this name already exists.");
      return;
    }

    writeLocalFile(path, "");
    closeNewFileModal();
    router.push(noteHref(path));
  };

  const syncMutation = useMutation({
    mutationFn: syncAllFromGitHub,
    onSettled: loadLocalFiles,
  });

  const renderItem = ({ item }: { item: string }) => {
    const hasPending = pendingFiles.includes(item);
    const folder = getFolderPath(item);
    return (
      <Link href={noteHref(item)} asChild>
        <TouchableOpacity
          style={styles.fileItem}
          accessibilityLabel={`${item}${hasPending ? ", has changes not on GitHub" : ""}`}
        >
          <Ionicons name="document-text-outline" size={24} color="#666" />
          <View style={styles.fileText}>
            <Text style={styles.fileName}>{getFileName(item)}</Text>
            {folder ? <Text style={styles.folderName}>{folder}</Text> : null}
          </View>
          {hasPending && <View style={styles.pendingDot} />}
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Files</Text>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setShowNewFileModal(true)}
          accessibilityRole="button"
          accessibilityLabel="New note"
        >
          <Ionicons name="add" size={28} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Download notes from GitHub"
        >
          {syncMutation.isPending ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="sync-outline" size={24} color="#007AFF" />
          )}
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
          <Text style={styles.successText}>
            {describeSyncResult(syncMutation.data)}
          </Text>
        </View>
      )}

      {localFiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptyHint}>
            Tap the sync button to download notes, or + to create a note
          </Text>
        </View>
      ) : (
        <FlatList
          data={localFiles}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          style={styles.list}
          refreshing={false}
          onRefresh={() => syncMutation.mutate()}
        />
      )}

      <Modal
        visible={showNewFileModal}
        transparent
        animationType="fade"
        onRequestClose={closeNewFileModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Note</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="name or folder/name"
              value={newFileName}
              onChangeText={(text) => {
                setNewFileName(text);
                setNewFileError(null);
              }}
              onSubmitEditing={handleCreateFile}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="File name"
            />
            {newFileError ? (
              <Text style={styles.modalError}>{newFileError}</Text>
            ) : (
              <Text style={styles.modalHint}>
                .md is added if there is no extension. Use / for folders.
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={closeNewFileModal}
                accessibilityRole="button"
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonCreate,
                  !newFileName.trim() && styles.modalButtonDisabled,
                ]}
                onPress={handleCreateFile}
                disabled={!newFileName.trim()}
                accessibilityRole="button"
              >
                <Text style={styles.modalButtonCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 12,
  },
  toolbarTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginLeft: 4,
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
  fileText: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    color: "#333",
  },
  folderName: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "80%",
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 16,
  },
  modalError: {
    fontSize: 12,
    color: "#c62828",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButtonCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalButtonCancelText: {
    color: "#666",
    fontSize: 16,
  },
  modalButtonCreate: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalButtonCreateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  modalButtonDisabled: {
    backgroundColor: "#ccc",
  },
});
