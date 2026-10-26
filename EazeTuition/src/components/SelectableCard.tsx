import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Props {
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
  fee?: number | null;
  children: React.ReactNode;
  statusTag?: React.ReactNode;

  type?: "checkbox" | "radio";
}

export default function SelectableCard({
  selected,
  disabled = false,
  onToggle,
  fee,
  children,
  statusTag,
  type = "checkbox",
}: Props) {

  const iconName =
    type === "radio"
      ? selected
        ? "radiobox-marked"
        : "radiobox-blank"
      : selected
        ? "checkbox-marked"
        : "checkbox-blank-outline";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        disabled && styles.cardDisabled,
        selected && !disabled && styles.cardSelected,
      ]}
      onPress={disabled ? undefined : onToggle}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <MaterialCommunityIcons
        name={iconName}
        size={24}
        color={disabled ? "#ccc" : selected ? "#0A84FF" : "#999"}
        style={{ marginRight: 12 }}
      />

      <View style={{ flex: 1, opacity: disabled ? 0.5 : 1 }}>{children}</View>

      {fee !== null && fee !== undefined && (
        <Text style={[styles.fee, disabled && styles.feeDisabled]}>RM{fee}</Text>
      )}

      {/* Render statusTag only if provided */}
      {statusTag && (
        <View style={{ position: "absolute", right: 14, bottom: 10 }}>
          {statusTag}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    marginBottom: 12,
  },
  cardSelected: {
    borderColor: "#0A84FF",
    backgroundColor: "#F0F6FF",
  },
  cardDisabled: {
    backgroundColor: "#F2F2F2",
    borderColor: "#E0E0E0",
  },
  fee: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 12,
    color: "#333",
  },
  feeDisabled: {
    color: "#aaa",
  },
});
