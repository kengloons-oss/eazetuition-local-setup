import React from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from "react-native";

interface Props {
    visible: boolean;
    title?: string;
    children?: React.ReactNode;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    hideButtons?: boolean;
}

export default function FloatingModal({
    visible,
    title,
    children,
    onClose,
    onConfirm,
    confirmText = "OK",
    hideButtons = false,
}: Props) {

    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <Animated.View style={[styles.box, { opacity: fadeAnim, maxHeight: "70%" }]}>

                    {title && <Text style={styles.title}>{title}</Text>}

                    <View style={{ width: "100%", marginTop: 10 }}>
                        {children}
                    </View>

                    {!hideButtons && (
                        <View style={styles.btnRow}>
                            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose}>
                                <Text style={styles.cancelText}>Close</Text>
                            </TouchableOpacity>

                            {onConfirm && (
                                <TouchableOpacity style={[styles.btn, styles.confirm]} onPress={onConfirm}>
                                    <Text style={styles.confirmText}>{confirmText}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
    },
    box: {
        width: "85%",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
        elevation: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
        color: "#333",
    },
    btnRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 20,
    },
    btn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginLeft: 12,
    },
    cancel: {
        backgroundColor: "#EEE",
    },
    confirm: {
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
