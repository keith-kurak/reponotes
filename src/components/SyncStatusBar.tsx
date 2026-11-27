import { AppColors, useAppColors } from "@/constants/colors";
import { usePendingNotes } from "@/hooks/use-pending-notes";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { describeSyncStatus } from "@/utils/syncStatusText";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

/** One line with the sync state; it updates live on every screen. */
export function SyncStatusBar() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const status = useSyncStatus();
  const { notes, conflicts } = usePendingNotes();
  const [tick, setTick] = useState(() => Date.now());

  // Keep "synced 5 min ago" current.
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // A sync that just finished is newer than the last tick.
  const now = Math.max(tick, status.lastSyncedAt ?? 0);
  const line = describeSyncStatus(
    status,
    { pending: notes.length, conflicts },
    now,
  );
  const color =
    line.tone === "error"
      ? colors.errorText
      : line.tone === "warning"
        ? colors.warningText
        : colors.textSecondary;
  const icon =
    line.tone === "error"
      ? "alert-circle-outline"
      : line.tone === "warning"
        ? "cloud-upload-outline"
        : "checkmark-circle-outline";

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
    >
      {status.isSyncing ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : (
        <Ionicons name={icon} size={16} color={color} />
      )}
      <Text style={[styles.text, { color }]} numberOfLines={2}>
        {line.text}
      </Text>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    text: {
      flex: 1,
      fontSize: 13,
    },
  });
}
