import React, { createContext, useContext, useState } from "react";
import NotificationBanner from "../components/NotificationBanner";

type NotificationData = {
    title: string;
    message: string;
    onPress?: () => void;
};

type NotificationContextProps = {
    showNotification: (data: NotificationData) => void;
};

const NotificationContext = createContext<NotificationContextProps>({
    showNotification: () => {},
});

export const useNotification = () => useContext(NotificationContext);
export function NotificationProvider({ children }: any) {
    const [data, setData] = useState<NotificationData | null>(null);
    const [visible, setVisible] = useState(false);

    const showNotification = (payload: NotificationData) => {
        setData(payload);
        setVisible(true);

        // Auto hide after 4s
        setTimeout(() => setVisible(false), 4000);
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}

            <NotificationBanner
                title={data?.title || ""}
                message={data?.message || ""}
                onPress={data?.onPress}
                visible={visible}
                onHide={() => setVisible(false)}  // ⭐ 必须加！
            />
        </NotificationContext.Provider>
    );
}
