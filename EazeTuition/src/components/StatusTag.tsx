import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export function StatusTag({
  label,
  bg,
  color
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <Text
      style={{
        backgroundColor: bg,
        color,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: "700",
      }}
    >
      {label}
    </Text>
  );
}
