import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { AppIcon } from "@/app/components/icon";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#0191d6",
        tabBarInactiveTintColor: "#8E8E93",

        tabBarStyle: styles.floatingPillTabBar,
        tabBarIconStyle: { justifyContent: "center", alignItems: "center" },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          height: 65,
          paddingBottom: 0,
          transform: [{ translateY: Platform.OS === "ios" ? 10 : 0 }],
        },

        tabBarBackground: () => (
          <View style={styles.blurContainer}>
            <BlurView
              tint="systemThickMaterialLight"
              intensity={30}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <AppIcon
              sfName="house.fill"
              lucideName="Home"
              size={34}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="homepage"
        options={{
          tabBarIcon: ({ color }) => (
            <AppIcon
              sfName="list.bullet.rectangle"
              lucideName="List"
              size={34}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => (
            <AppIcon
              sfName="person.crop.circle.fill"
              lucideName="User"
              size={34}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingPillTabBar: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    height: 65,
    borderRadius: 35,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: "transparent",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 35,
    overflow: "hidden",
  },
});
