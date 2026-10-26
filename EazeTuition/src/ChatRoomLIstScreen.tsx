import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { RootStackParamList } from "../types/navigation";
import { useChatRoomSync } from "./hooks/useChatRoomSync";
import { ChatRoom } from "../types/chat";
import { addBtnStyle } from "./styles/userStyles";
import { API_BASE_URL } from "./config";
import FloatingModal from "./components/FloatingModal";
import { useChatContext } from "./components/ChatContext";
import TutorBottomBar from "./tutor/tutorBottomBar";
import BottomBar from "./BottomBar";


export default function ChatRoomListScreen() {
    const [userId, setUserId] = useState<number | null>(null);
    const [user, setUser] = useState<any>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [userList, setUserList] = useState<{ user_id: number; name: string }[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(true);

    const [searchText, setSearchText] = useState("");
    const filteredUsers = userList.filter((u) =>
        u.name.toLowerCase().includes(searchText.toLowerCase())
    );


    const { refreshFlag } = useChatContext();

    type Nav = NativeStackNavigationProp<RootStackParamList, "ChatRoom">;
    const navigation = useNavigation<Nav>();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await AsyncStorage.getItem("user");
                const user = JSON.parse(userData || "{}");
                if (user) {
                    setUserId(user.user_id);
                    setUser(user);
                }
            } catch (err) {
                console.log("Failed to load user", err);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (!userId) return;

        const init = async () => {
            setLoadingRooms(true);
            await syncRooms();     // 🟦 先跑 backend sync
            setLoadingRooms(false);
        };

        init();
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        syncRooms();  // 自动 refresh
    }, [refreshFlag]);


    // ⭐ Hook 2: chat room sync (但 guard userId=null)
    const { rooms, syncRooms } = useChatRoomSync(userId ?? 0);

    if (userId === null) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 16, color: "#777" }}>Loading...</Text>
            </View>
        );
    }

    if (loadingRooms) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 16, color: "#777" }}>
                    Loading chats...
                </Text>
            </View>
        );
    }


    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No chat history yet.</Text>
        </View>
    );

    //============================================================================
    // Handle Start New Chat
    //============================================================================
    const openUserModal = async () => {
        setShowUserModal(true);
        setLoadingUsers(true);

        try {
            const res = await fetch(`${API_BASE_URL}/chat/mobile/active_users`);
            const data = await res.json();

            // ❗️❗️ FILTER OUT SELF HERE
            setUserList(data.filter((u: { user_id: number; name: string }) => u.user_id !== userId));
        } catch (err) {
            console.log("Failed to fetch user list", err);
        }

        setLoadingUsers(false);
    };


    const handleStartChat = async (targetUserId: number) => {
        if (!targetUserId) {
            console.log("User ID not loaded yet");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/chat/mobile/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    current_user_id: userId,
                    target_user_id: targetUserId
                }),
            });

            const data = await res.json();

            if (data.status === "success") {
                setShowUserModal(false);
                await syncRooms();

                navigation.navigate("ChatRoom", {
                    chat_room_id: data.data.room_id,
                });
            }
        } catch (err) {
            console.log("Start chat failed:", err);
        }
    };



    return (
        <View style={styles.container}>
            {/* ============================== */}
            {/*     Add New Chat BUTTON     */}
            {/* ============================== */}
            <TouchableOpacity
                style={addBtnStyle.enrollBtn}
                onPress={openUserModal}
            >
                <MaterialCommunityIcons
                    name="plus"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 10 }}
                />
                <Text style={addBtnStyle.enrollText}>Add New Chat</Text>

                <MaterialCommunityIcons
                    name="chevron-right"
                    size={26}
                    color="#fff"
                    style={{ marginLeft: "auto" }}
                />
            </TouchableOpacity>

            <FlatList<ChatRoom>
                data={rooms}
                ListEmptyComponent={renderEmpty}
                keyExtractor={(item) => item.chat_room_id.toString()}
                onRefresh={syncRooms}
                refreshing={false}
                renderItem={({ item }) => (

                    <TouchableOpacity
                        style={styles.row}
                        onPress={() =>
                            navigation.navigate("ChatRoom", {
                                chat_room_id: item.chat_room_id,
                            })
                        }
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{item.room_name}</Text>
                            <Text style={styles.preview} numberOfLines={1}>
                                {item.last_message || "No messages yet"}
                            </Text>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                            <Text style={styles.time}>{item.last_time || ""}</Text>

                            {item.unread_count > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            />

            <FloatingModal
                visible={showUserModal}
                title="Start New Chat"
                onClose={() => setShowUserModal(false)}
                hideButtons={true}
            >
                {/* Search Bar */}
                <TextInput
                    placeholder="Search user..."
                    style={{
                        borderWidth: 1,
                        borderColor: "#ccc",
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 12,
                    }}
                    value={searchText}
                    onChangeText={setSearchText}
                />

                {/* Scrollable User List - fixed height */}
                <View
                    style={{
                        maxHeight: 280,
                        borderWidth: 1,
                        borderColor: "#eee",
                        borderRadius: 8,
                        overflow: "hidden",
                        marginBottom: 16,
                    }}
                >
                    {loadingUsers ? (
                        <View style={{ padding: 20 }}>
                            <Text style={{ textAlign: "center" }}>Loading...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredUsers}
                            keyExtractor={(item) => item.user_id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{
                                        paddingVertical: 12,
                                        paddingHorizontal: 6,
                                        borderBottomWidth: 1,
                                        borderColor: "#eee",
                                    }}
                                    onPress={() => handleStartChat(item.user_id)}
                                >
                                    <Text style={{ fontSize: 16 }}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>

                {/* Cancel button */}
                <TouchableOpacity
                    onPress={() => setShowUserModal(false)}
                    style={{
                        alignSelf: "flex-end",
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        backgroundColor: "#EEE",
                        borderRadius: 8,
                    }}
                >
                    <Text style={{ color: "#444", fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
            </FloatingModal>

            {user.type == "tutor" ? (
                <View className="absolute bottom-0 left-0 right-0">
                    <TutorBottomBar />
                </View>
            ) : user.type == "student" ? (
                <View className="absolute bottom-0 left-0 right-0">
                    <BottomBar />
                </View>
            ) 
            : null}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F6FB",
        paddingTop: 10,
    },

    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    emptyContainer: {
        paddingTop: 40,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        color: "#777",
    },

    row: {
        flexDirection: "row",
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },

    name: {
        fontSize: 16,
        fontWeight: "700",
        color: "#222",
    },

    preview: {
        marginTop: 4,
        fontSize: 14,
        color: "#777",
    },

    time: {
        fontSize: 12,
        color: "#999",
    },

    badge: {
        backgroundColor: "#FF5B5B",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        marginTop: 6,
    },

    badgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
});
