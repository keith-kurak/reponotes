import { AppColors, useAppColors } from "@/constants/colors";
import {
  EditState,
  insertCodeBlock,
  LinePrefixKind,
  toggleInlineCode,
  toggleLinePrefix,
} from "@/utils/markdownCommands";
import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { KeyboardToolbar } from "react-native-keyboard-controller";

type Command = (state: EditState) => EditState;

interface ToolbarItem {
  label: string;
  accessibilityLabel: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  command: Command;
}

const linePrefix =
  (kind: LinePrefixKind): Command =>
  (state) =>
    toggleLinePrefix(state, kind);

const ITEMS: ToolbarItem[] = [
  { label: "H1", accessibilityLabel: "Heading 1", command: linePrefix("h1") },
  { label: "H2", accessibilityLabel: "Heading 2", command: linePrefix("h2") },
  { label: "H3", accessibilityLabel: "Heading 3", command: linePrefix("h3") },
  {
    label: "Bullet",
    accessibilityLabel: "Bullet list",
    icon: "list",
    command: linePrefix("bullet"),
  },
  {
    label: "Checkbox",
    accessibilityLabel: "Checkbox",
    icon: "checkbox-outline",
    command: linePrefix("checkbox"),
  },
  {
    label: "Code",
    accessibilityLabel: "Inline code",
    icon: "code-outline",
    command: toggleInlineCode,
  },
  {
    label: "Code block",
    accessibilityLabel: "Code block",
    icon: "code-slash-outline",
    command: insertCodeBlock,
  },
];

interface MarkdownToolbarProps {
  onCommand: (command: Command) => void;
}

/** Keyboard accessory with buttons for common markdown syntax. */
export function MarkdownToolbar({ onCommand }: MarkdownToolbarProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <KeyboardToolbar>
      <KeyboardToolbar.Content>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.row}
        >
          {ITEMS.map((item) => (
            <Pressable
              key={item.accessibilityLabel}
              onPress={() => onCommand(item.command)}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel}
              hitSlop={4}
            >
              {item.icon ? (
                <Ionicons name={item.icon} size={22} color={colors.text} />
              ) : (
                <Text style={styles.label}>{item.label}</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </KeyboardToolbar.Content>
    </KeyboardToolbar>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: {
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
    },
    button: {
      minWidth: 44,
      height: 36,
      paddingHorizontal: 8,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonPressed: {
      backgroundColor: c.border,
    },
    label: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
  });
}
