// app/styles/listBoxStyles.ts
import { StyleSheet } from "react-native";

export const listBoxStyles = StyleSheet.create({
  baseCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#222",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 14,
    padding: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  column: {
    flexDirection: "column",
  },

  titleText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
  },

  descriptionText: {
    fontSize: 14,
    color: "#555",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  statusText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
  },

  // ✅ 统一按钮尺寸
  actionButton: {
    minWidth: 130, // 保证文字不同长度也不会太小
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
  },
});
