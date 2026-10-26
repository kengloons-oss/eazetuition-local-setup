import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator } from "react-native";

export type AlertType = "warning" | "success" | "error" | "loading";

export interface AlertConfig {
  visible: boolean;
  type: AlertType;
  title?: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onlyConfirm?: boolean;
}

export default function SweetAlertModal({
  visible,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  onlyConfirm,
}: AlertConfig) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const iconConfig = {
    warning: { name: "alert-circle", color: "#FFC107" },
    success: { name: "check-circle", color: "#4CAF50" },
    error: { name: "close-circle", color: "#E53935" },
    loading: { name: "loading", color: "#0077E6" },
  };

  React.useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
          {/* ICON */}
          {type !== "loading" ? (
            <MaterialCommunityIcons
              name={iconConfig[type].name as any}
              size={50}
              color={iconConfig[type].color}
              style={{ marginBottom: 10 }}
            />
          ) : (
            <ActivityIndicator
              size="large"
              color="#0077E6"
              style={{ marginBottom: 10 }}
            />
          )}

          {/* TITLE + MESSAGE */}
          {title && <Text style={styles.title}>{title}</Text>}
          <Text style={styles.message}>{message}</Text>

          {/* BUTTONS (hidden if loading) */}
          {type !== "loading" && (
            <View style={styles.buttonRow}>
              {/* ❗️Show Cancel only when:
                   - type === "warning"
                   - AND not in single-button mode (onlyConfirm !== true)
              */}
              {type === "warning" && !onlyConfirm && (
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}

              {/* Confirm / OK */}
              <TouchableOpacity
                style={[styles.btn, styles.confirmBtn]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmText}>
                  {type === "warning" && !onlyConfirm ? "Confirm" : "OK"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

//
// Styles
//
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: "#333",
  },
  message: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#E0E0E0",
  },
  confirmBtn: {
    backgroundColor: "#0077E6",
  },
  cancelText: {
    color: "#444",
    fontWeight: "600",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "700",
  },
});
