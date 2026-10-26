import { useEffect, useRef } from "react";
import { useNotification } from "../components/NotificationContext";
import { API_BASE_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useChatContext } from "./ChatContext";


type Props = {
    userId: number;
};

export default function ChatPollingListener({ userId }: Props) {
    const lastNotifiedId = useRef<number | null>(null);
    const { showNotification } = useNotification();
    const { activeRoom, triggerRefresh } = useChatContext();

    const navigation =
        useNavigation<NativeStackNavigationProp<RootStackParamList>>();
        

    useEffect(() => {
        if (!userId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/chat/mobile/unread_count?user_id=${userId}`
                );
                const data = await res.json();

                if (data.status !== "success") return;

                const latest = data.latest;
                const unread = data.unread;

                if (!latest || unread === 0) return;

                if (lastNotifiedId.current === latest.message_id) return;
                lastNotifiedId.current = latest.message_id;

                console.log(latest.room_id);

                if (activeRoom === latest.room_id) {
                    // 用户就在这个聊天室 → 不要通知、不 triggerRefresh
                    return;
                }


                showNotification({
                    title: latest.sender_name,
                    message: latest.content,
                    onPress: () => {
                        navigation.navigate("ChatRoom", {
                            chat_room_id: latest.room_id,
                        });
                    },
                });
                triggerRefresh();

            } catch (e) {
                console.log("Polling error:", e);
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [userId, activeRoom]);

    return null;
}
