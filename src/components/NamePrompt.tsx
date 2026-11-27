import { AppColors, useAppColors } from "@/constants/colors";
import { useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface NamePromptProps {
  visible: boolean;
  title: string;
  placeholder: string;
  hint: string;
  confirmLabel: string;
  /** Returns an error message to show, or null when the name was accepted. */
  onSubmit: (name: string) => string | null;
  onCancel: () => void;
}

/** Small dialog that asks for a file or folder name. */
export function NamePrompt({
  visible,
  title,
  placeholder,
  hint,
  confirmLabel,
  onSubmit,
  onCancel,
}: NamePromptProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName("");
    setError(null);
    onCancel();
  };

  const submit = () => {
    const message = onSubmit(name);
    if (message) {
      setError(message);
      return;
    }
    setName("");
    setError(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            onSubmitEditing={submit}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={title}
          />
          <Text style={error ? styles.error : styles.hint}>
            {error ?? hint}
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancel}
              onPress={close}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirm, !name.trim() && styles.disabled]}
              onPress={submit}
              disabled={!name.trim()}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    content: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 24,
      width: "80%",
      maxWidth: 320,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
      marginBottom: 16,
    },
    input: {
      color: c.text,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 8,
    },
    hint: {
      fontSize: 12,
      color: c.textTertiary,
      marginBottom: 16,
    },
    error: {
      fontSize: 12,
      color: c.errorText,
      marginBottom: 16,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    cancel: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    cancelText: {
      color: c.textSecondary,
      fontSize: 16,
    },
    confirm: {
      backgroundColor: c.tint,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    confirmText: {
      color: c.onTint,
      fontSize: 16,
      fontWeight: "500",
    },
    disabled: {
      backgroundColor: c.disabled,
    },
  });
}
