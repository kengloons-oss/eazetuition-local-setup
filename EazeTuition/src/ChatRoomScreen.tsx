import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    FlatList
} from "react-native";
import { useRoute } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { useChatContext } from "./components/ChatContext";

import {
    getMessagesByRoom,
    upsertMessage,
    upsertChatRoom,
    getChatRoomById,
} from "./database/localDB";
import { useChatRoomSync } from "./hooks/useChatRoomSync";


import { API_BASE_URL } from "./config";

export default function ChatRoomScreen() {
    const route = useRoute();
    const { chat_room_id } = route.params as any;

    const [roomName, setRoomName] = useState<string>("");
    const [userId, setUserId] = useState<number | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");

    const [sending, setSending] = useState(false);

    const { syncRecentMessages } = useChatRoomSync(userId || 0);
    const { triggerRefresh, setActiveRoom } = useChatContext();

    const flatListRef = useRef<FlatList>(null);
    const [showScrollDown, setShowScrollDown] = useState(false);

    const isCloseToBottom = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        return e.nativeEvent.contentOffset.y <= 100;
    };


    useEffect(() => {
        const loadInit = async () => {
            const userData = await AsyncStorage.getItem("user");
            if (userData) {
                const u = JSON.parse(userData);
                setUserId(u.user_id);
            }

            const room = getChatRoomById(chat_room_id);
            if (room?.room_name) {
                setRoomName(room.room_name);
            }
        };

        loadInit();
    }, []);

    useEffect(() => {
        if (!userId) return;   // 👈 避免 null 调后台
        loadMessages();

        const timer = setInterval(loadMessages, 6000);
        return () => clearInterval(timer);
    }, [userId]);


    useEffect(() => {
        const room = getChatRoomById(chat_room_id);
        if (room?.room_name) {
            setRoomName(room.room_name);
        }
    }, [chat_room_id]);


    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }
    }, [messages]);

    useEffect(() => {
        setActiveRoom(chat_room_id);
        return () => setActiveRoom(null);
    }, []);

    const loadMessages = async () => {
        const net = await NetInfo.fetch();

        if (net.isConnected) {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/chat/mobile/messages/${chat_room_id}?current_user_id=${userId}`
                );

                const data = await res.json();

                // Save messages locally
                data.forEach((msg: any) => upsertMessage(msg));

                setMessages(getMessagesByRoom(chat_room_id));

                // update chat room
                const localRoom = getChatRoomById(chat_room_id);

                if (data.length) {
                    upsertChatRoom({
                        chat_room_id,
                        room_name: localRoom?.room_name ?? "",  // ⬅️ 正确
                        last_message: data[data.length - 1].content,
                        last_time: data[data.length - 1].send_datetime,
                        unread_count: 0,
                    });
                }

                // Update chat room list to remove unread count
                triggerRefresh();
                return;
            } catch (err) {
                console.log("API load error, fallback to local");
            }
        }

        // offline fallback
        setMessages(getMessagesByRoom(chat_room_id));
    };

    const sendMessage = async () => {
        if (!input.trim()) return;
        if (!userId) return;

        const text = input.trim();
        setInput("");
        setSending(true);

        console.log(userId);

        try {
            const res = await fetch(`${API_BASE_URL}/chat/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    room_id: chat_room_id,
                    content: text,
                    sender_id: userId
                }),
            });

            const result = await res.json();

            if (result.status === "success") {
                // 🟢 同步最近 5 分钟的新消息
                await syncRecentMessages(chat_room_id, 5, userId);

                // 更新 UI
                setMessages(getMessagesByRoom(chat_room_id));
            } else {
                Alert.alert("Send Failed", result.message || "Failed to send message.");
            }
        } catch (err) {
            console.log("send fail", err);
            Alert.alert("Send Failed", "Network error, please try again.");
        } finally {
            setSending(false); // 🔵 停止 loading
        }
    };



    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}>{roomName}</Text>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={[...messages].reverse()}
                inverted   // 🔥 小魔法：列表反转 = 永远从底部开始
                keyExtractor={(item) => item.message_id.toString()}
                renderItem={({ item }) => {
                    const isMine = item.sender_id === userId;
                    return (
                        <View style={[styles.msgContainer, isMine ? styles.right : styles.left]}>
                            <View style={[styles.bubble, isMine ? styles.me : styles.other]}>
                                <Text style={isMine ? styles.textMe : styles.textOther}>
                                    {item.content}
                                </Text>
                            </View>
                            <Text style={styles.time}>{item.send_datetime}</Text>
                        </View>
                    );
                }}
                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
                    setShowScrollDown(!isCloseToBottom(e))
                }

                scrollEventThrottle={16}
            />
            {/* 🔽 Scroll-To-Bottom 按钮 */}
            {showScrollDown && (
                <TouchableOpacity
                    style={styles.scrollDownBtn}
                    onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                >
                    <Text style={{ color: "white", fontWeight: "bold" }}>↓</Text>
                </TouchableOpacity>
            )}


            {/* Input Area */}
            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Type message..."
                />
                <TouchableOpacity
                    style={[styles.sendBtn, sending && { opacity: 0.5 }]}
                    onPress={sending ? undefined : sendMessage}
                    disabled={sending}
                >
                    <Text style={{ color: "#fff" }}>
                        {sending ? "Sending..." : "Send"}
                    </Text>
                </TouchableOpacity>

            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({

    header: {
        padding: 14,
        backgroundColor: "#2d6cdf",
        alignItems: "center",
    },
    headerText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },
    messages: {
        flex: 1,
        padding: 10,
        backgroundColor: "#f7f7f7",
    },
    msgContainer: {
        marginVertical: 8,
        maxWidth: "70%",
    },
    left: { alignSelf: "flex-start" },
    right: { alignSelf: "flex-end" },
    bubble: {
        padding: 10,
        borderRadius: 14,
    },
    me: { backgroundColor: "#007bff", borderBottomRightRadius: 4 },
    other: { backgroundColor: "#e8e8e8", borderBottomLeftRadius: 4 },
    textMe: {
        color: "#fff"   // 🟦 你的消息：白字
    },

    textOther: {
        color: "#333"   // ⚪ 对方消息：深灰
    },
    time: {
        fontSize: 11,
        opacity: 0.6,
        marginTop: 2,
    },
    inputArea: {
        flexDirection: "row",
        padding: 10,
        paddingBottom: 20,  // 👈 增加底部距离
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#ddd",
    },
    input: {
        flex: 1,
        backgroundColor: "#f1f1f1",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    sendBtn: {
        marginLeft: 10,
        backgroundColor: "#2d6cdf",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
    },

    scrollDownBtn: {
        position: "absolute",
        bottom: 90,
        right: 20,
        backgroundColor: "#2d6cdf",
        width: 45,
        height: 45,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },

});
