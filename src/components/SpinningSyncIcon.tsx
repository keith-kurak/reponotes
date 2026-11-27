import { useAppColors } from "@/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

/**
 * The sync icon, turning. The header shows it in place of the Sync button
 * while a sync runs. Same glyph as the button: SF Symbol on iOS, Material
 * icon on Android.
 */
export function SpinningSyncIcon() {
  const colors = useAppColors();
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  // arrow.triangle.2.circlepath turns clockwise; Material "sync" turns the
  // other way.
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", Platform.OS === "ios" ? "360deg" : "-360deg"],
  });

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Syncing"
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        {Platform.OS === "ios" ? (
          <SymbolView
            name="arrow.triangle.2.circlepath"
            size={22}
            tintColor={colors.text}
          />
        ) : (
          <MaterialIcons name="sync" size={24} color={colors.text} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
