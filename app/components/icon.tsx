import React from "react";
import { Platform, StyleProp, ViewStyle } from "react-native";
import { SFSymbol } from "react-native-sfsymbols"; // Or your SF Symbols package
import * as LucideIcons from "lucide-react-native";

// Define types for Lucide icon names
type LucideIconName = keyof typeof LucideIcons;

interface AppIconProps {
  sfName: string;
  lucideName: LucideIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const AppIcon: React.FC<AppIconProps> = ({
  sfName,
  lucideName,
  size = 24,
  color = "#000",
  style,
}) => {
  if (Platform.OS === "ios") {
    return (
      <SFSymbol
        name={sfName}
        weight="semibold"
        scale="medium"
        color={color}
        style={[{ width: size, height: size }, style]}
      />
    );
  }

  const IconComponent =
    (LucideIcons[lucideName] as React.ComponentType<any>) ||
    LucideIcons.HelpCircle;

  return <IconComponent size={size} color={color} style={style} />;
};
