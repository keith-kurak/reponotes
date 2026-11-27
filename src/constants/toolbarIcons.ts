import type { Stack } from "expo-router";
import type { ComponentProps } from "react";
import { ImageSourcePropType, Platform } from "react-native";

type ToolbarIcon = NonNullable<
  ComponentProps<typeof Stack.Toolbar.Button>["icon"]
>;

// Header toolbar icons: SF Symbols on iOS, Material vector drawables on
// Android (Stack.Toolbar on Android needs an image source).
function icon(
  sfSymbol: Extract<ToolbarIcon, string>,
  android: ImageSourcePropType,
): ToolbarIcon {
  return Platform.OS === "ios" ? sfSymbol : (android as ToolbarIcon);
}

export const toolbarIcons = {
  sync: icon(
    "arrow.triangle.2.circlepath",
    require("../../assets/icons/sync.xml"),
  ),
  add: icon("plus", require("../../assets/icons/add.xml")),
  newNote: icon(
    "square.and.pencil",
    require("../../assets/icons/note_add.xml"),
  ),
  newFolder: icon(
    "folder.badge.plus",
    require("../../assets/icons/create_new_folder.xml"),
  ),
  edit: icon("pencil", require("../../assets/icons/edit.xml")),
  done: icon("checkmark", require("../../assets/icons/check.xml")),
  pin: icon("pin", require("../../assets/icons/push_pin_outline.xml")),
  unpin: icon("pin.fill", require("../../assets/icons/push_pin.xml")),
  plainMarkdown: icon(
    "chevron.left.forwardslash.chevron.right",
    require("../../assets/icons/code.xml"),
  ),
};
