import { AppHost } from "@/components/AppHost";
import { AppColors, useAppColors } from "@/constants/colors";
import { useMarkdownStyle } from "@/constants/markdownStyle";
import { toolbarIcons } from "@/constants/toolbarIcons";
import { useNotesData } from "@/hooks/use-notes-version";
import {
  EditorMode,
  NoteEditor,
  NoteEditorHandle,
} from "@/components/NoteEditor";
import { Toast, ToastType } from "@/components/Toast";
import { getFileName, readLocalFile, writeLocalFile } from "@/utils/fileSystem";
import { noteMetadata } from "@/utils/noteMetadata";
import { pendingChanges } from "@/utils/pendingChanges";
import { downloadNote, forceUploadNote } from "@/utils/sync";
import { Ionicons } from "@expo/vector-icons";
import { Button, Row } from "@expo/ui";
import { useMutation } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, usePreventRemove } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";

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
  // Read from disk on every change, so a sync updates the open note.
  const { content, error } = useNotesData(() => loadNote(notePath));
  const isPinned = useNotesData(() => noteMetadata.isPinned(notePath));
  const hasConflict = useNotesData(() => noteMetadata.hasConflict(notePath));

  const [isEditing, setIsEditing] = useState(false);
  // The text the editor started with, to know whether it changed.
  const [editStartContent, setEditStartContent] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("checking");
  const [isFinishing, setIsFinishing] = useState(false);
  const editorRef = useRef<NoteEditorHandle>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: ToastType;
    message: string;
  }>({ visible: false, type: "success", message: "" });

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ visible: true, type, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (notePath && !error) {
      noteMetadata.markOpened(notePath);
    }
  }, [notePath, error]);

  const handleStartEditing = () => {
    setEditStartContent(content);
    setEditorMode("checking");
    setIsEditing(true);
  };

  const handleEditorModeChange = useCallback((mode: EditorMode) => {
    setEditorMode(mode);
  }, []);

  /** Saves the editor's text. Returns true when editing has ended. */
  const saveEdits = async (): Promise<boolean> => {
    const editor = editorRef.current;
    if (!editor || isFinishing) return false;
    setIsFinishing(true);
    try {
      const result = await editor.finish();
      if (result.status === "review") {
        // Nothing was saved. The editor now shows the markdown in plain mode,
        // with a banner that explains why.
        return false;
      }
      if (result.markdown !== editStartContent) {
        writeLocalFile(notePath, result.markdown);
        pendingChanges.add(notePath);
      }
      setIsEditing(false);
      return true;
    } catch (err) {
      showToast("error", errorMessage(err, "Could not save the note"));
      return false;
    } finally {
      setIsFinishing(false);
    }
  };

  // Going back while editing saves first, like Done. If a save check fails,
  // the screen stays open with the review banner, so no text is lost.
  usePreventRemove(isEditing, ({ repeat }) => {
    void saveEdits().then((saved) => {
      if (saved) repeat();
    });
  });

  const resolveConflictMutation = useMutation({
    mutationFn: async (choice: "keep-mine" | "use-github") => {
      if (choice === "keep-mine") {
        await forceUploadNote(notePath);
      } else {
        await downloadNote(notePath);
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

  const confirmUseGitHub = () => {
    Alert.alert(
      "Use the GitHub version?",
      "Your changes to this note on this device will be replaced.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use GitHub version",
          style: "destructive",
          onPress: () => resolveConflictMutation.mutate("use-github"),
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: notePath ? getFileName(notePath) : "Note",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Toolbar placement="right">
        {!isEditing && (
          <Stack.Toolbar.Button
            icon={isPinned ? toolbarIcons.unpin : toolbarIcons.pin}
            accessibilityLabel={isPinned ? "Unpin note" : "Pin note"}
            onPress={() => noteMetadata.setPinned(notePath, !isPinned)}
          />
        )}
        {isEditing && editorMode === "rich" && (
          <Stack.Toolbar.Button
            icon={toolbarIcons.plainMarkdown}
            accessibilityLabel="Edit as plain markdown"
            onPress={() => void editorRef.current?.switchToPlain()}
          />
        )}
        {isEditing ? (
          <Stack.Toolbar.Button
            icon={toolbarIcons.done}
            variant="done"
            accessibilityLabel="Done editing"
            disabled={isFinishing}
            onPress={() => void saveEdits()}
          />
        ) : (
          <Stack.Toolbar.Button
            icon={toolbarIcons.edit}
            accessibilityLabel="Edit note"
            disabled={!!error || resolveConflictMutation.isPending}
            onPress={handleStartEditing}
          />
        )}
      </Stack.Toolbar>

      <View style={styles.container}>
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color={colors.errorBorder}
            />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : isEditing ? (
          <NoteEditor
            ref={editorRef}
            initialMarkdown={editStartContent}
            onModeChange={handleEditorModeChange}
          />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
          >
            {hasConflict && (
              <View style={styles.conflict} accessibilityRole="alert">
                <Text style={styles.conflictTitle}>
                  This note changed on GitHub and on this device
                </Text>
                <Text style={styles.conflictText}>
                  Choose which version to keep.
                </Text>
                <View style={styles.conflictButtons}>
                  {resolveConflictMutation.isPending ? (
                    <ActivityIndicator color={colors.tint} />
                  ) : (
                    <AppHost matchContents>
                      <Row spacing={8}>
                        <Button
                          variant="outlined"
                          label="Use GitHub version"
                          onPress={confirmUseGitHub}
                        />
                        <Button
                          variant="filled"
                          label="Keep mine"
                          onPress={() =>
                            resolveConflictMutation.mutate("keep-mine")
                          }
                        />
                      </Row>
                    </AppHost>
                  )}
                </View>
              </View>
            )}
            {content.length === 0 ? (
              <Pressable
                style={styles.emptyArea}
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
                // The rich editor writes Enter as a single newline; show it
                // as a line break, as the editor does.
                md4cFlags={{ hardSoftBreaks: true }}
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
      flexGrow: 1,
      padding: 16,
    },
    emptyArea: {
      flexGrow: 1,
    },
    conflict: {
      padding: 12,
      marginBottom: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.errorBorder,
      backgroundColor: c.errorBackground,
      gap: 4,
    },
    conflictTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: c.errorText,
    },
    conflictText: {
      fontSize: 14,
      color: c.text,
    },
    conflictButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 8,
    },
    emptyHint: {
      fontSize: 16,
      lineHeight: 24,
      color: c.textTertiary,
    },
  });
}
