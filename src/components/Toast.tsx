import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";

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
  const [opacity] = useState(new Animated.Value(0));

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
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  const isSuccess = type === "success";

  return (
    <Animated.View
      style={[
        styles.container,
        isSuccess ? styles.successBox : styles.errorBox,
        { opacity },
      ]}
    >
      <Ionicons
        name={isSuccess ? "checkmark-circle" : "alert-circle"}
        size={20}
        color={isSuccess ? "#2e7d32" : "#c62828"}
      />
      <Text style={[styles.text, isSuccess ? styles.successText : styles.errorText]}>
        {message}
      </Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={18} color={isSuccess ? "#2e7d32" : "#c62828"} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  successBox: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4caf50",
  },
  errorBox: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
  },
  text: {
    flex: 1,
    fontSize: 14,
  },
  successText: {
    color: "#2e7d32",
  },
  errorText: {
    color: "#c62828",
  },
});
