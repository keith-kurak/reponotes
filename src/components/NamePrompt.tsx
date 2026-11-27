import { useAppColors } from "@/constants/colors";
import {
  BottomSheet,
  Button,
  Column,
  Row,
  Spacer,
  Text,
  TextInput,
  useNativeState,
} from "@expo/ui";
import { useState } from "react";

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

/**
 * Native bottom sheet that asks for a file or folder name.
 * Render it inside an Expo UI `Host`.
 */
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
  const name = useNativeState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    name.set("");
    setError(null);
  };

  const close = () => {
    reset();
    onCancel();
  };

  const submit = () => {
    const message = onSubmit(name.get());
    if (message) {
      setError(message);
      return;
    }
    reset();
  };

  return (
    <BottomSheet isPresented={visible} onDismiss={close} showDragIndicator>
      <Column spacing={12} style={{ padding: 20 }}>
        <Text
          textStyle={{ fontSize: 20, fontWeight: "600", color: colors.text }}
        >
          {title}
        </Text>
        <TextInput
          value={name}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={title}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={{
            padding: 12,
            borderRadius: 10,
            backgroundColor: colors.background,
          }}
        />
        <Text
          textStyle={{
            fontSize: 13,
            color: error ? colors.errorText : colors.textTertiary,
          }}
        >
          {error ?? hint}
        </Text>
        <Row spacing={12} style={{ width: "100%" }}>
          <Spacer flexible />
          <Button variant="text" label="Cancel" onPress={close} />
          <Button variant="filled" label={confirmLabel} onPress={submit} />
        </Row>
      </Column>
    </BottomSheet>
  );
}
