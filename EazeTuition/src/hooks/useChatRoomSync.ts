// app/hooks/useChatRoomSync.ts
import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { API_BASE_URL } from "../config";

import {
    upsertChatRoom,
    getAllChatRooms,
    upsertChatMembers,
    upsertMessage,
    getMessagesByRoom,
} from "../database/localDB";

import { ChatRoom } from "../../types/chat";

export function useChatRoomSync(user_id: number) {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);

    useEffect(() => {
        if (!user_id) return;
        syncRooms();
    }, []);

    /**
     * 🔄 Sync all chat rooms for this user (list)
     */
    const syncRooms = async () => {
        if (!user_id) return;

        const net = await NetInfo.fetch();
        if (!net.isConnected) {
            setRooms(getAllChatRooms(user_id));
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/chat/mobile/rooms/${user_id}`);
            const data: ChatRoom[] = await res.json();

            data.forEach(r => {
                upsertChatRoom(r);
                if (r.members) upsertChatMembers(r.chat_room_id, r.members);
            });

            setRooms(getAllChatRooms(user_id));
        } catch (err) {
            console.log("chat sync fail", err);
            setRooms(getAllChatRooms(user_id));
        }
    };

    /**
     * 🟦 Sync recent messages of a room within last N minutes
     */
    const syncRecentMessages = async (room_id: number, minutes: number = 5, current_user_id?: number) => {
        const net = await NetInfo.fetch();
        if (!net.isConnected) {
            return getMessagesByRoom(room_id);
        }

        try {
            const since = new Date(Date.now() - minutes * 60 * 1000)
                .toISOString()
                .slice(0, 16); // "YYYY-MM-DDTHH:MM"

            const url = `${API_BASE_URL}/chat/mobile/messages/${room_id}?since=${since}&current_user_id=${current_user_id}`;
            const res = await fetch(url);

            const data = await res.json();

            // Store messages locally
            data.forEach((m: any) => upsertMessage(m));


            if (!Array.isArray(data)) {
                console.log("invalid syncRecentMessages response", data);
                return getMessagesByRoom(room_id);
            }

        } catch (err) {
            console.log("syncRecentMessages error", err);
            return getMessagesByRoom(room_id);
        }
    };

    return {
        rooms,
        syncRooms,
        syncRecentMessages, // 🟦 expose this for ChatRoomScreen
    };
}
