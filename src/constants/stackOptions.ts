import { Platform } from "react-native";

/** Shared header options for the stack inside each tab. */
export const tabStackScreenOptions = Platform.select({
  ios: {
    headerLargeTitleEnabled: true,
    headerTransparent: true,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerBackButtonDisplayMode: "minimal" as const,
  },
  default: {
    headerBackButtonDisplayMode: "minimal" as const,
  },
});
