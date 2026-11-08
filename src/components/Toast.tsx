import { AppColors, useAppColors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ToastProps {
  message: string;
  type: "success" | "error";
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

  const isSuccess = type === "success";

  return (
    <Animated.View
      style={[
        styles.container,
        isSuccess ? styles.successBox : styles.errorBox,
        { opacity, bottom: insets.bottom + 16 },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name={isSuccess ? "checkmark-circle" : "alert-circle"}
        size={20}
        color={isSuccess ? colors.successText : colors.errorText}
      />
      <Text style={[styles.text, isSuccess ? styles.successText : styles.errorText]}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss message"
      >
        <Ionicons name="close" size={18} color={isSuccess ? colors.successText : colors.errorText} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      position: "absolute",
      left: 16,
      right: 16,
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
  });
}
