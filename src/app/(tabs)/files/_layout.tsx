import { tabStackScreenOptions } from "@/constants/stackOptions";
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={tabStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: "Files" }} />
    </Stack>
  );
}
