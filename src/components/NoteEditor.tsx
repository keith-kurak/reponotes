import { AppColors, useAppColors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import {
  findUnsafeLiteralMarkup,
  isSameMarkdown,
  withOriginalTrailingWhitespace,
} from "@/utils/richEditorSafety";
import {
  Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  EnrichedMarkdownTextInput,
  EnrichedMarkdownTextInputInstance,
  MarkdownTextInputStyle,
} from "react-native-enriched-markdown";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export type EditorMode = "checking" | "rich" | "plain";

export type FinishResult =
  | { status: "saved"; markdown: string }
  /** A save check failed: nothing was saved and the editor is now plain. */
  | { status: "review"; reason: string };

export interface NoteEditorHandle {
  /** Returns the markdown to save, or switches to plain mode for review. */
  finish: () => Promise<FinishResult>;
  /** Moves the current text to the plain markdown editor. */
  switchToPlain: () => Promise<void>;
}

interface NoteEditorProps {
  ref?: Ref<NoteEditorHandle>;
  initialMarkdown: string;
  onModeChange?: (mode: EditorMode) => void;
}

/**
 * Note editor with two modes:
 * - rich: enriched-markdown WYSIWYG editor, used only when the note survives a
 *   load/save round trip unchanged,
 * - plain: a TextInput with the raw markdown.
 */
export function NoteEditor({
  ref,
  initialMarkdown,
  onModeChange,
}: NoteEditorProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const inputStyle = useMemo(() => createInputMarkdownStyle(colors), [colors]);

  // An empty note has nothing to lose, so it opens in rich mode at once.
  const [mode, setModeState] = useState<EditorMode>(
    initialMarkdown.trim() === "" ? "rich" : "checking",
  );
  const [plainText, setPlainText] = useState(initialMarkdown);
  // Why the editor is in plain mode; shown in a banner until editing ends.
  const [notice, setNotice] = useState<string | null>(null);
  const richRef = useRef<EnrichedMarkdownTextInputInstance>(null);
  const verifierRef = useRef<EnrichedMarkdownTextInputInstance>(null);
  // Plain text the user sees in the rich editor (from onChangeText).
  const visibleTextRef = useRef<string | null>(null);

  const setMode = useCallback((next: EditorMode, reason?: string) => {
    setModeState(next);
    setNotice(reason ?? null);
  }, []);

  // Report every mode to the parent, including the first one.
  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  /** Loads markdown into the hidden verifier editor and reads it back. */
  const roundTrip = useCallback(async (markdown: string) => {
    const verifier = verifierRef.current;
    if (!verifier) throw new Error("Editor is not ready");
    verifier.setValue(markdown);
    return verifier.getMarkdown();
  }, []);

  // Load check: open in rich mode only if the note survives a round trip.
  useEffect(() => {
    if (mode !== "checking") return;
    let cancelled = false;
    roundTrip(initialMarkdown)
      .then((output) => {
        if (cancelled) return;
        if (isSameMarkdown(output, initialMarkdown)) {
          setMode("rich");
        } else {
          setMode(
            "plain",
            "This note has markdown the rich editor cannot keep exactly (for example code blocks or tables). Editing as plain markdown.",
          );
        }
      })
      .catch(() => {
        if (!cancelled)
          setMode(
            "plain",
            "Rich editor not available. Editing as plain markdown.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [mode, initialMarkdown, roundTrip, setMode]);

  const finishRich = useCallback(async (): Promise<FinishResult> => {
    const rich = richRef.current;
    if (!rich) return { status: "saved", markdown: initialMarkdown };
    const markdown = await rich.getMarkdown();

    // No edits: keep the file exactly as it is.
    if (isSameMarkdown(markdown, initialMarkdown)) {
      return { status: "saved", markdown: initialMarkdown };
    }

    const restored = withOriginalTrailingWhitespace(markdown, initialMarkdown);
    let reason: string | null = null;

    // Check 1: the saved markdown must load back to the same markdown.
    const reloaded = await roundTrip(restored);
    if (!isSameMarkdown(reloaded, restored)) {
      reason = "the rich editor would change the text when it loads it again";
    }

    // Check 2: literal markdown characters would load back as formatting.
    if (!reason && visibleTextRef.current !== null) {
      reason = findUnsafeLiteralMarkup(visibleTextRef.current);
    }

    if (reason) {
      setPlainText(restored);
      setMode(
        "plain",
        `Not saved yet: ${reason}. Check the markdown below, then tap Done.`,
      );
      return { status: "review", reason };
    }
    return { status: "saved", markdown: restored };
  }, [initialMarkdown, roundTrip, setMode]);

  useImperativeHandle(
    ref,
    () => ({
      finish: async () => {
        if (mode === "plain") return { status: "saved", markdown: plainText };
        if (mode === "checking") {
          return { status: "saved", markdown: initialMarkdown };
        }
        return finishRich();
      },
      switchToPlain: async () => {
        if (mode !== "rich") return;
        const markdown =
          (await richRef.current?.getMarkdown()) ?? initialMarkdown;
        setPlainText(
          isSameMarkdown(markdown, initialMarkdown)
            ? initialMarkdown
            : withOriginalTrailingWhitespace(markdown, initialMarkdown),
        );
        setMode("plain");
      },
    }),
    [mode, plainText, initialMarkdown, finishRich, setMode],
  );

  return (
    <View style={styles.container}>
      {mode === "checking" && (
        <View style={styles.checking}>
          <ActivityIndicator color={colors.tint} />
        </View>
      )}

      {mode === "rich" && (
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          <EnrichedMarkdownTextInput
            ref={richRef}
            defaultValue={initialMarkdown}
            markdownStyle={inputStyle}
            markdownShortcuts
            // Underline is written as _text_ (italic in standard markdown) and
            // spoiler as ||text|| (not standard), so the menu hides both.
            formatMenuConfig={{
              underline: { enabled: false },
              spoiler: { enabled: false },
            }}
            autoFocus
            multiline
            scrollEnabled={false}
            placeholder="Start writing…"
            placeholderTextColor={colors.textTertiary}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
            style={styles.richInput}
            onChangeText={(text) => {
              visibleTextRef.current = text;
            }}
            accessibilityLabel="Note text"
          />
        </KeyboardAwareScrollView>
      )}

      {mode === "plain" && (
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          {notice && (
            <View
              style={styles.notice}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}
          <TextInput
            style={styles.plainInput}
            value={plainText}
            onChangeText={setPlainText}
            placeholder="Start writing…"
            placeholderTextColor={colors.textTertiary}
            multiline
            // With a notice, start at the top so the notice is visible.
            autoFocus={!notice}
            scrollEnabled={false}
            textAlignVertical="top"
            autoCapitalize="sentences"
            accessibilityLabel="Note markdown"
          />
        </KeyboardAwareScrollView>
      )}

      {/* Hidden editor used only for round-trip checks. */}
      <View
        style={styles.verifier}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <EnrichedMarkdownTextInput
          ref={verifierRef}
          editable={false}
          scrollEnabled={false}
          style={styles.verifierInput}
        />
      </View>
    </View>
  );
}

function createInputMarkdownStyle(c: AppColors): MarkdownTextInputStyle {
  const heading = { color: c.text };
  return {
    strong: { color: c.text },
    em: { color: c.text },
    link: { color: c.tint, underline: true },
    h1: heading,
    h2: heading,
    h3: heading,
    h4: heading,
    h5: heading,
    h6: heading,
    list: { itemSpacing: 4 },
  };
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    checking: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    richInput: {
      flexGrow: 1,
      padding: 16,
      fontSize: 16,
      color: c.text,
    },
    notice: {
      flexDirection: "row",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.surface,
    },
    noticeText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: c.text,
    },
    plainInput: {
      flexGrow: 1,
      padding: 16,
      fontSize: 16,
      lineHeight: 24,
      color: c.text,
      fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
      textAlignVertical: "top",
    },
    verifier: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 1,
      opacity: 0,
      overflow: "hidden",
    },
    verifierInput: {
      width: "100%",
      height: 1,
    },
  });
}
