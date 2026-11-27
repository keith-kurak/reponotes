import { useAppColors } from "@/constants/colors";
import { Host } from "@expo/ui";
import {
  AnimatedVisibility,
  Column,
  EnterTransition,
  ExitTransition,
  ExtendedFloatingActionButton,
  FloatingActionButton,
  Icon,
  Text,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import type { AddFabProps } from "./AddFab";

/**
 * Material speed-dial button: tap + to show "New note" and "New folder".
 */
export function AddFab({ onNewNote, onNewFolder }: AddFabProps) {
  const colors = useAppColors();
  const [expanded, setExpanded] = useState(false);

  const choose = (action: () => void) => {
    setExpanded(false);
    action();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Host matchContents seedColor={colors.tint}>
        <Column
          horizontalAlignment="end"
          verticalArrangement={{ spacedBy: 12 }}
        >
          <AnimatedVisibility
            visible={expanded}
            enterTransition={EnterTransition.fadeIn().plus(
              EnterTransition.expandVertically(),
            )}
            exitTransition={ExitTransition.fadeOut().plus(
              ExitTransition.shrinkVertically(),
            )}
          >
            <Column
              horizontalAlignment="end"
              verticalArrangement={{ spacedBy: 12 }}
            >
              <ExtendedFloatingActionButton onClick={() => choose(onNewFolder)}>
                <ExtendedFloatingActionButton.Icon>
                  <Icon
                    source={require("../../assets/icons/create_new_folder.xml")}
                    contentDescription="New folder"
                  />
                </ExtendedFloatingActionButton.Icon>
                <ExtendedFloatingActionButton.Text>
                  <Text>New folder</Text>
                </ExtendedFloatingActionButton.Text>
              </ExtendedFloatingActionButton>
              <ExtendedFloatingActionButton onClick={() => choose(onNewNote)}>
                <ExtendedFloatingActionButton.Icon>
                  <Icon
                    source={require("../../assets/icons/note_add.xml")}
                    contentDescription="New note"
                  />
                </ExtendedFloatingActionButton.Icon>
                <ExtendedFloatingActionButton.Text>
                  <Text>New note</Text>
                </ExtendedFloatingActionButton.Text>
              </ExtendedFloatingActionButton>
            </Column>
          </AnimatedVisibility>
          <FloatingActionButton onClick={() => setExpanded((value) => !value)}>
            <FloatingActionButton.Icon>
              <Icon
                source={
                  expanded
                    ? require("../../assets/icons/close.xml")
                    : require("../../assets/icons/add.xml")
                }
                contentDescription={expanded ? "Close add menu" : "Add"}
              />
            </FloatingActionButton.Icon>
          </FloatingActionButton>
        </Column>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
