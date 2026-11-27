import { Icon } from "@expo/ui";

// Icons for native list rows: SF Symbols on iOS, Material drawables on Android.
export const listIcons = {
  folder: Icon.select({
    ios: "folder",
    android: require("../../assets/icons/folder.xml"),
  }),
  note: Icon.select({
    ios: "doc.text",
    android: require("../../assets/icons/description.xml"),
  }),
  pin: Icon.select({
    ios: "pin.fill",
    android: require("../../assets/icons/push_pin.xml"),
  }),
  upToDate: Icon.select({
    ios: "checkmark.circle",
    android: require("../../assets/icons/check_circle.xml"),
  }),
  pending: Icon.select({
    ios: "arrow.up.circle",
    android: require("../../assets/icons/cloud_upload.xml"),
  }),
  error: Icon.select({
    ios: "exclamationmark.triangle",
    android: require("../../assets/icons/error.xml"),
  }),
  sync: Icon.select({
    ios: "arrow.triangle.2.circlepath",
    android: require("../../assets/icons/sync.xml"),
  }),
};
