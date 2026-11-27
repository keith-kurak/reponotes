import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { NativeTabs } from "expo-router/native-tabs";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="house" />,
          android: (
            <NativeTabs.Trigger.Icon
              src={
                <NativeTabs.Trigger.VectorIcon
                  family={MaterialCommunityIcons}
                  name="home"
                />
              }
            />
          ),
        })}
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="files">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="folder" />,
          android: (
            <NativeTabs.Trigger.Icon
              src={
                <NativeTabs.Trigger.VectorIcon
                  family={MaterialCommunityIcons}
                  name="folder"
                />
              }
            />
          ),
        })}
        <NativeTabs.Trigger.Label>Files</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="gearshape" />,
          android: (
            <NativeTabs.Trigger.Icon
              src={
                <NativeTabs.Trigger.VectorIcon
                  family={MaterialIcons}
                  name="settings"
                />
              }
            />
          ),
        })}
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
