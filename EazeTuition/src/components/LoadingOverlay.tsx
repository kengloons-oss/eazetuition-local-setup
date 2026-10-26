import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
}

export default function LoadingOverlay({ visible, message = "Please wait..." }: LoadingOverlayProps) {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.box}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.text}>{message}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.30)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
    },
    box: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 12,
        alignItems: "center",
        width: 180,
    },
    text: {
        marginTop: 10,
        fontSize: 15,
        fontWeight: "600",
        textAlign: "center",
    },
});
