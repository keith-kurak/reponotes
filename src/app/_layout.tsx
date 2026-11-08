import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false, title: "Notes" }}
            />
            <Stack.Screen
              name="note/[...path]"
              options={{ title: "Note", headerBackButtonDisplayMode: "minimal" }}
            />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
