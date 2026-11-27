import { useAppColors } from "@/constants/colors";
import { Host } from "@expo/ui";
import type { ComponentProps } from "react";

/**
 * Expo UI Host with the app's theme: the Material color scheme on Android is
 * generated from the app tint color.
 */
export function AppHost(props: ComponentProps<typeof Host>) {
  const colors = useAppColors();
  return <Host seedColor={colors.tint} {...props} />;
}
