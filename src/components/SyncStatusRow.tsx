import { useAppColors } from "@/constants/colors";
import { listIcons } from "@/constants/listIcons";
import { useSyncStatusLine } from "@/hooks/use-sync-status-line";
import { syncNow } from "@/utils/sync";
import { Icon, ListItem, Text } from "@expo/ui";

/**
 * Native list row with the live sync status. Use inside a List or
 * FieldSection. A tap syncs; with changes to sync (or after a failed sync)
 * the row says so.
 */
export function SyncStatusRow({
  inFieldGroup = false,
}: {
  /** Rows in a FieldGroup use the section's background on Android. */
  inFieldGroup?: boolean;
}) {
  const colors = useAppColors();
  const line = useSyncStatusLine();
  const color =
    line.tone === "error"
      ? colors.errorText
      : line.tone === "warning"
        ? colors.warningText
        : colors.textSecondary;
  const icon = line.isSyncing
    ? listIcons.sync
    : line.tone === "error"
      ? listIcons.error
      : line.tone === "warning"
        ? listIcons.pending
        : listIcons.upToDate;

  const hasWork = !line.isSyncing && line.tone !== "neutral";

  return (
    <ListItem
      colors={inFieldGroup ? { containerColor: "transparent" } : undefined}
      // Always set: on Android, removing onPress from a ListItem fails
      // ("Cannot set prop 'modifiers'"). syncNow() ignores a second tap.
      onPress={() => void syncNow()}
      supportingText={hasWork ? "Tap to sync now" : undefined}
    >
      <ListItem.Leading>
        <Icon name={icon} size={20} color={color} style={{ width: 28 }} />
      </ListItem.Leading>
      <Text textStyle={{ color, fontSize: 15 }}>{line.text}</Text>
    </ListItem>
  );
}
