import { FolderView } from "@/components/FolderView";
import { useLocalSearchParams } from "expo-router";

export default function FolderScreen() {
  const { folder } = useLocalSearchParams<{ folder: string[] }>();
  const path = Array.isArray(folder) ? folder.join("/") : (folder ?? "");
  return <FolderView folderPath={path} />;
}
