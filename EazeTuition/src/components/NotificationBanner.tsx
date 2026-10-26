import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, Easing } from "react-native";

type Props = {
    title: string;
    message: string;
    onPress?: () => void;
    visible: boolean;
    onHide?: () => void; // 通知 Provider 关掉状态
};

export default function NotificationBanner({ title, message, onPress, visible, onHide }: Props) {
    const translateY = useRef(new Animated.Value(-100)).current;
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hideBanner = () => {
        Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            onHide?.();
        });
    };

    useEffect(() => {
        if (visible) {
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }).start(() => onHide?.());
        }
    }, [visible]);


    return (
        <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
            <Pressable
                style={styles.card}
                onPress={() => {
                    // 用户点了，需立即关闭
                    hideBanner();

                    // 然后执行用户传来的 navigation
                    onPress?.();
                }}
            >
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        elevation: 10,
        alignItems: "center",
        paddingTop: 40,
    },
    card: {
        backgroundColor: "#333",
        padding: 14,
        borderRadius: 12,
        width: "92%",
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    title: {
        color: "white",
        fontWeight: "600",
        fontSize: 16,
        marginBottom: 2,
    },
    message: {
        color: "#e5e5e5",
        fontSize: 14,
    },
});
