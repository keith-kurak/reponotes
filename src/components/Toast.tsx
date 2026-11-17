import { AppColors, useAppColors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({
  message,
  type,
  visible,
  onDismiss,
  duration = 5000,
}: ToastProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [opacity] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, duration);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
    }
  }, [visible, message, duration, onDismiss, opacity]);

  if (!visible) return null;

  const variant = {
    success: {
      box: styles.successBox,
      text: styles.successText,
      color: colors.successText,
      icon: "checkmark-circle" as const,
    },
    error: {
      box: styles.errorBox,
      text: styles.errorText,
      color: colors.errorText,
      icon: "alert-circle" as const,
    },
    info: {
      box: styles.infoBox,
      text: styles.infoText,
      color: colors.text,
      icon: "information-circle" as const,
    },
  }[type];

  return (
    // Stays above the keyboard when it is open.
    <KeyboardStickyView
      style={[styles.position, { bottom: insets.bottom + 16 }]}
      offset={{ closed: 0, opened: insets.bottom }}
    >
      <Animated.View
        style={[styles.container, variant.box, { opacity }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Ionicons name={variant.icon} size={20} color={variant.color} />
        <Text style={[styles.text, variant.text]}>{message}</Text>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
        >
          <Ionicons name="close" size={18} color={variant.color} />
        </TouchableOpacity>
      </Animated.View>
    </KeyboardStickyView>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    position: {
      position: "absolute",
      left: 16,
      right: 16,
    },
    container: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
    },
    successBox: {
      backgroundColor: c.successBackground,
      borderColor: c.successBorder,
    },
    errorBox: {
      backgroundColor: c.errorBackground,
      borderColor: c.errorBorder,
    },
    text: {
      flex: 1,
      fontSize: 14,
    },
    successText: {
      color: c.successText,
    },
    errorText: {
      color: c.errorText,
    },
    infoBox: {
      backgroundColor: c.surface,
      borderColor: c.inputBorder,
    },
    infoText: {
      color: c.text,
    },
  });
}
