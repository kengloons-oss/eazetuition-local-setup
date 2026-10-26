// components/BottomBar.tsx
import React from "react";
import { View, StyleSheet, TouchableOpacity, Animated } from "react-native";

export default function BottomBar({
  expanded,
  miniContent,
  expandedContent,
  onExpand,
  onCollapse,

  // 👉 simple button mode
  label,
  disabled,
  onPress,
}: {
  expanded?: boolean;
  miniContent?: React.ReactNode;
  expandedContent?: React.ReactNode;
  onExpand?: () => void;
  onCollapse?: () => void;

  // simple button bar 的 props（可选）
  label?: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const isButtonMode = label !== undefined;

  return (
    <View style={styles.container}>
      {isButtonMode ? (
        // ===========================
        // SIMPLE BUTTON MODE
        // - 复用 expandedBar layout
        // ===========================
        <View style={styles.expandedBar}>
          <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[styles.primaryButton, disabled && { opacity: 0.5 }]}
            activeOpacity={0.85}
          >
            <Animated.Text style={styles.primaryButtonLabel}>
              {label}
            </Animated.Text>
          </TouchableOpacity>
        </View>
      ) : (
        // ===========================
        // EXPANDABLE MODE（保持你原本的）
        // ===========================
        <>
          {!expanded && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.miniBar}
              onPress={onExpand}
            >
              {miniContent}
            </TouchableOpacity>
          )}

          {expanded && (
            <View style={styles.expandedBar}>
              {expandedContent}

              <TouchableOpacity
                onPress={onCollapse}
                style={{ alignItems: "center", marginTop: 10 }}
              >
                <Animated.Text style={{ color: "#0077E6", fontWeight: "600" }}>
                  Hide
                </Animated.Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
  },

  // Mini Mode
  miniBar: {
    borderTopWidth: 1,
    borderColor: "#ddd",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Expanded Mode（被 button 模式复用）
  expandedBar: {
    padding: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },

  // simple button 放在 expandedBar 里面
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#0077E6",
  },
  primaryButtonLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
