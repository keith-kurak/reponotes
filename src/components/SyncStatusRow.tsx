import { useAppColors } from "@/constants/colors";
import { listIcons } from "@/constants/listIcons";
import { useSyncStatusLine } from "@/hooks/use-sync-status-line";
import { Icon, ListItem, Text } from "@expo/ui";

/** Native list row with the live sync status. Use inside a List or FieldSection. */
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

  return (
    <ListItem
      colors={inFieldGroup ? { containerColor: "transparent" } : undefined}
    >
      <ListItem.Leading>
        <Icon name={icon} size={20} color={color} style={{ width: 28 }} />
      </ListItem.Leading>
      <Text textStyle={{ color, fontSize: 15 }}>{line.text}</Text>
    </ListItem>
  );
}
