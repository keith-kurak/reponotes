import { Toast } from "@/components/Toast";
import { readLocalFile, writeLocalFile } from "@/utils/fileSystem";
import {
  createFileOnGitHub,
  fetchFileContentWithSha,
  GitHubAPIError,
  updateFileContent,
} from "@/utils/github";
import { noteMetadata } from "@/utils/noteMetadata";
import { fileSha, pendingChanges } from "@/utils/pendingChanges";
import { storage } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function NoteViewerScreen() {
  const { filename } = useLocalSearchParams<{ filename: string }>();
  const [content, setContent] = useState<string>("");
  const [editedContent, setEditedContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error";
    message: string;
  }>({ visible: false, type: "success", message: "" });

  const decodedFilename = filename ? decodeURIComponent(filename) : "";

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ visible: true, type, message });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const loadContent = () => {
    if (!filename) return;

    try {
      setLoading(true);
      setError(null);
      const fileContent = readLocalFile(decodedFilename);
      setContent(fileContent);
      setEditedContent(fileContent);
      const isPending = pendingChanges.has(decodedFilename);
      setHasPendingChanges(isPending);
      const pinned = noteMetadata.isPinned(decodedFilename);
      setIsPinned(pinned);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [filename]);

  const handleStartEditing = () => {
    setEditedContent(content);
    setIsEditing(true);
  };

  const handleFinishEditing = () => {
    if (editedContent !== content) {
      writeLocalFile(decodedFilename, editedContent);
      setContent(editedContent);
      pendingChanges.add(decodedFilename);
      setHasPendingChanges(true);
    }
    setIsEditing(false);
  };

  const handleTogglePin = () => {
    const newPinned = !isPinned;
    noteMetadata.setPinned(decodedFilename, newPinned);
    setIsPinned(newPinned);
  };

  const syncMutation = useMutation({
    onSuccess: () => {
      showToast(
        "success",
        hasPendingChanges
          ? "Changes saved to GitHub!"
          : "File synced successfully!",
      );
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to sync file",
      );
    },
    mutationFn: async () => {
      if (!filename) throw new Error("No filename provided");

      const token = storage.getGitHubPAT();
      const repoName = storage.getRepoName();
      const owner = storage.getGitHubOwner();

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

      if (hasPendingChanges) {
        // Upload changes to GitHub
        let sha = fileSha.get(decodedFilename);
        let newSha: string;

        if (!sha) {
          // Try to fetch the current SHA from GitHub if we don't have it stored
          try {
            const current = await fetchFileContentWithSha(
              token,
              repoName,
              owner,
              decodedFilename,
            );
            sha = current.sha;
          } catch (error) {
            // File doesn't exist on GitHub yet - that's OK, we'll create it
            if (!(error instanceof GitHubAPIError && error.status === 404)) {
              throw error;
            }
          }
        }

        if (sha) {
          // Update existing file
          newSha = await updateFileContent(
            token,
            repoName,
            owner,
            decodedFilename,
            content,
            sha,
          );
        } else {
          // Create new file on GitHub
          newSha = await createFileOnGitHub(
            token,
            repoName,
            owner,
            decodedFilename,
            content,
          );
        }

        fileSha.set(decodedFilename, newSha);
        pendingChanges.remove(decodedFilename);
        setHasPendingChanges(false);
      } else {
        // Download from GitHub
        const result = await fetchFileContentWithSha(
          token,
          repoName,
          owner,
          decodedFilename,
        );
        writeLocalFile(decodedFilename, result.content);
        fileSha.set(decodedFilename, result.sha);
        setContent(result.content);
        setEditedContent(result.content);
      }
    },
  });

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          title: filename ? decodeURIComponent(filename) : "Note",
          headerRight: () => (
            <View style={styles.headerButtons}>
              {hasPendingChanges && !isEditing && (
                <View style={styles.pendingDot} />
              )}
              {!isEditing && (
                <TouchableOpacity
                  onPress={handleTogglePin}
                  disabled={loading}
                  style={styles.headerButton}
                >
                  <Ionicons
                    name={isPinned ? "pin" : "pin-outline"}
                    size={22}
                    color={isPinned ? "#007AFF" : "#999"}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={isEditing ? handleFinishEditing : handleStartEditing}
                disabled={loading || syncMutation.isPending}
                style={styles.headerButton}
              >
                <Ionicons
                  name={isEditing ? "checkmark" : "create-outline"}
                  size={24}
                  color="#007AFF"
                />
              </TouchableOpacity>
              {!isEditing && (
                <TouchableOpacity
                  onPress={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  style={styles.headerButton}
                >
                  {syncMutation.isPending ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Ionicons
                      name={
                        hasPendingChanges
                          ? "cloud-upload-outline"
                          : "sync-outline"
                      }
                      size={24}
                      color="#007AFF"
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        <Toast
          visible={toast.visible}
          type={toast.type}
          message={toast.message}
          onDismiss={hideToast}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.textInput}
              value={editedContent}
              onChangeText={setEditedContent}
              multiline
              autoFocus
              scrollEnabled
              textAlignVertical="top"
            />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
          >
            <Text style={styles.text}>{content}</Text>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFC107",
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#f44336",
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  editContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  editContent: {
    flexGrow: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    fontFamily: "monospace",
  },
  textInput: {
    flex: 1,
    //minHeight: "100%",
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    fontFamily: "monospace",
  },
});
