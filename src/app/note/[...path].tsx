import { AppColors, useAppColors } from "@/constants/colors";
import { useMarkdownStyle } from "@/constants/markdownStyle";
import { Toast } from "@/components/Toast";
import { getFileName, readLocalFile, writeLocalFile } from "@/utils/fileSystem";
import { noteMetadata } from "@/utils/noteMetadata";
import { fileSha, pendingChanges } from "@/utils/pendingChanges";
import { downloadNote, forceUploadNote, uploadNote } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

type SyncOutcome = "uploaded" | "downloaded" | "conflict" | "not-on-github";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function loadNote(notePath: string): { content: string; error: string | null } {
  try {
    return { content: readLocalFile(notePath), error: null };
  } catch (err) {
    return { content: "", error: errorMessage(err, "Failed to load file") };
  }
}

export default function NoteViewerScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const markdownStyle = useMarkdownStyle();
  const { path } = useLocalSearchParams<{ path: string[] }>();
  const notePath = Array.isArray(path) ? path.join("/") : (path ?? "");
  // Local files are read synchronously, so the note loads on the first render.
  const [initialNote] = useState(() => loadNote(notePath));
  const error = initialNote.error;
  const [content, setContent] = useState(initialNote.content);
  const [editedContent, setEditedContent] = useState(initialNote.content);
  const [isEditing, setIsEditing] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(() =>
    pendingChanges.has(notePath),
  );
  const [isPinned, setIsPinned] = useState(() =>
    noteMetadata.isPinned(notePath),
  );
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error";
    message: string;
  }>({ visible: false, type: "success", message: "" });

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ visible: true, type, message });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (notePath && !error) {
      noteMetadata.markOpened(notePath);
    }
  }, [notePath, error]);

  const handleStartEditing = () => {
    setEditedContent(content);
    setIsEditing(true);
  };

  const handleFinishEditing = () => {
    if (editedContent !== content) {
      writeLocalFile(notePath, editedContent);
      setContent(editedContent);
      pendingChanges.add(notePath);
      setHasPendingChanges(true);
    }
    setIsEditing(false);
  };

  const handleTogglePin = () => {
    const newPinned = !isPinned;
    noteMetadata.setPinned(notePath, newPinned);
    setIsPinned(newPinned);
  };

  const applyDownloadedContent = (newContent: string) => {
    setContent(newContent);
    setEditedContent(newContent);
    setHasPendingChanges(false);
  };

  const resolveConflictMutation = useMutation({
    mutationFn: async (choice: "keep-mine" | "use-github") => {
      if (choice === "keep-mine") {
        await forceUploadNote(notePath);
        setHasPendingChanges(false);
      } else {
        applyDownloadedContent(await downloadNote(notePath));
      }
      return choice;
    },
    onSuccess: (choice) => {
      showToast(
        "success",
        choice === "keep-mine"
          ? "Your version was saved to GitHub."
          : "Note replaced with the GitHub version.",
      );
    },
    onError: (err) => showToast("error", errorMessage(err, "Sync failed")),
  });

  const showConflictAlert = () => {
    Alert.alert(
      "This note changed on GitHub",
      "The GitHub version is different from the version you edited. Which version do you want to keep?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use GitHub version",
          style: "destructive",
          onPress: () => resolveConflictMutation.mutate("use-github"),
        },
        {
          text: "Keep mine",
          onPress: () => resolveConflictMutation.mutate("keep-mine"),
        },
      ],
    );
  };

  const syncMutation = useMutation({
    mutationFn: async (): Promise<SyncOutcome> => {
      if (hasPendingChanges) {
        const result = await uploadNote(notePath);
        if (result === "uploaded") setHasPendingChanges(false);
        return result;
      }
      if (!fileSha.get(notePath)) {
        return "not-on-github";
      }
      applyDownloadedContent(await downloadNote(notePath));
      return "downloaded";
    },
    onSuccess: (outcome) => {
      switch (outcome) {
        case "uploaded":
          showToast("success", "Changes saved to GitHub.");
          break;
        case "downloaded":
          showToast("success", "Note is up to date with GitHub.");
          break;
        case "not-on-github":
          showToast(
            "error",
            "This note is not on GitHub yet. Edit it, then tap upload.",
          );
          break;
        case "conflict":
          showConflictAlert();
          break;
      }
    },
    onError: (err) => showToast("error", errorMessage(err, "Sync failed")),
  });

  const isBusy = syncMutation.isPending || resolveConflictMutation.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          title: notePath ? getFileName(notePath) : "Note",
          headerBackButtonDisplayMode: "minimal",
          headerRight: () => (
            <View style={styles.headerButtons}>
              {hasPendingChanges && !isEditing && (
                <View
                  style={styles.pendingDot}
                  accessible
                  accessibilityLabel="Has changes not on GitHub"
                />
              )}
              {!isEditing && (
                <TouchableOpacity
                  onPress={handleTogglePin}
                  style={styles.headerButton}
                  accessibilityRole="button"
                  accessibilityLabel={isPinned ? "Unpin note" : "Pin note"}
                >
                  <Ionicons
                    name={isPinned ? "pin" : "pin-outline"}
                    size={22}
                    color={isPinned ? colors.tint : colors.textTertiary}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={isEditing ? handleFinishEditing : handleStartEditing}
                disabled={!!error || isBusy}
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel={isEditing ? "Done editing" : "Edit note"}
              >
                <Ionicons
                  name={isEditing ? "checkmark" : "create-outline"}
                  size={24}
                  color={colors.tint}
                />
              </TouchableOpacity>
              {!isEditing && (
                <TouchableOpacity
                  onPress={() => syncMutation.mutate()}
                  disabled={isBusy}
                  style={styles.headerButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    hasPendingChanges
                      ? "Upload changes to GitHub"
                      : "Download latest from GitHub"
                  }
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                  ) : (
                    <Ionicons
                      name={
                        hasPendingChanges
                          ? "cloud-upload-outline"
                          : "sync-outline"
                      }
                      size={24}
                      color={colors.tint}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.errorBorder} />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : isEditing ? (
          <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.editContent}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              style={styles.textInput}
              value={editedContent}
              onChangeText={setEditedContent}
              placeholder="Start writing…"
              placeholderTextColor={colors.textTertiary}
              multiline
              autoFocus
              scrollEnabled={false}
              textAlignVertical="top"
              accessibilityLabel="Note text"
            />
          </KeyboardAwareScrollView>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
          >
            {content.length === 0 ? (
              <Pressable
                onPress={handleStartEditing}
                accessibilityRole="button"
              >
                <Text style={styles.emptyHint}>
                  This note is empty. Tap here to start writing.
                </Text>
              </Pressable>
            ) : (
              <EnrichedMarkdownText
                flavor="github"
                markdown={content}
                markdownStyle={markdownStyle}
                selectable
                enableTaskListItemToggle={false}
                onLinkPress={({ url }) => {
                  Linking.openURL(url).catch(() =>
                    showToast("error", `Cannot open link: ${url}`),
                  );
                }}
              />
            )}
          </ScrollView>
        )}

        <Toast
          visible={toast.visible}
          type={toast.type}
          message={toast.message}
          onDismiss={hideToast}
        />
      </View>
    </>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
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
      backgroundColor: c.pending,
      marginRight: 4,
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
      color: c.errorBorder,
      marginTop: 16,
    },
    errorMessage: {
      fontSize: 14,
      color: c.textSecondary,
      marginTop: 8,
      textAlign: "center",
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
      color: c.text,
      fontFamily: "monospace",
    },
    emptyHint: {
      fontSize: 16,
      lineHeight: 24,
      color: c.textTertiary,
    },
    textInput: {
      flexGrow: 1,
      padding: 16,
      fontSize: 16,
      lineHeight: 24,
      color: c.text,
      fontFamily: "monospace",
      textAlignVertical: "top",
    },
  });
}
