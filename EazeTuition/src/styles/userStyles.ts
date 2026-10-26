// parent/styles/parentStyles.ts
import { StyleSheet } from "react-native";

export const addBtnStyle = StyleSheet.create({
    enrollBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0A84FF",
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        borderRadius: 10,
        marginBottom: 16,
    },
    enrollText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});

