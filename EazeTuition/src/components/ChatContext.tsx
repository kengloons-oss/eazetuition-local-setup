import { createContext, useContext, useState } from "react";

type ChatContextType = {
    refreshFlag: boolean;
    triggerRefresh: () => void;
    activeRoom: number | null;
    setActiveRoom: (roomId: number | null) => void;
};

const ChatContext = createContext<ChatContextType>({
    refreshFlag: false,
    triggerRefresh: () => { },
    activeRoom: null,
    setActiveRoom: () => { },
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [refreshFlag, setRefreshFlag] = useState(false);
    const [activeRoom, setActiveRoom] = useState<number | null>(null);

    const triggerRefresh = () => {
        setRefreshFlag(prev => !prev);
    };

    return (
        <ChatContext.Provider
            value={{
                refreshFlag,
                triggerRefresh,
                activeRoom,
                setActiveRoom,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export const useChatContext = () => useContext(ChatContext);
