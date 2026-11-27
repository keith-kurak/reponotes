import { useColorScheme } from "react-native";

// App color tokens for light and dark mode. Use these instead of hex literals.
const light = {
  background: "#ffffff",
  surface: "#f9f9f9",
  surfaceAccent: "#f0f8ff",
  surfacePinned: "#e3f2fd",
  inputBackground: "#f9f9f9",
  border: "#eeeeee",
  inputBorder: "#dddddd",
  text: "#333333",
  textSecondary: "#666666",
  textTertiary: "#999999",
  textMuted: "#bbbbbb",
  icon: "#666666",
  iconMuted: "#cccccc",
  tint: "#007AFF",
  onTint: "#ffffff",
  disabled: "#cccccc",
  pending: "#FFC107",
  warningBackground: "#FFF8E1",
  warningText: "#F57C00",
  successBackground: "#e8f5e9",
  successBorder: "#4caf50",
  successText: "#2e7d32",
  errorBackground: "#ffebee",
  errorBorder: "#f44336",
  errorText: "#c62828",
  overlay: "rgba(0, 0, 0, 0.5)",
};

export type AppColors = typeof light;

const dark: AppColors = {
  background: "#000000",
  surface: "#1c1c1e",
  surfaceAccent: "#0a2540",
  surfacePinned: "#0d2a45",
  inputBackground: "#1c1c1e",
  border: "#2c2c2e",
  inputBorder: "#3a3a3c",
  text: "#f2f2f7",
  textSecondary: "#aeaeb2",
  textTertiary: "#8e8e93",
  textMuted: "#636366",
  icon: "#aeaeb2",
  iconMuted: "#48484a",
  tint: "#0A84FF",
  onTint: "#ffffff",
  disabled: "#3a3a3c",
  pending: "#FFD60A",
  warningBackground: "#332500",
  warningText: "#FFB340",
  successBackground: "#0f2e14",
  successBorder: "#30d158",
  successText: "#7ee29a",
  errorBackground: "#3a1210",
  errorBorder: "#ff453a",
  errorText: "#ff8a80",
  overlay: "rgba(0, 0, 0, 0.7)",
};

export const appColors = { light, dark };

export function useAppColors(): AppColors {
  return useColorScheme() === "dark" ? dark : light;
}
