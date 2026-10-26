// BottomBar.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Icon from 'react-native-vector-icons/MaterialIcons';

type RootStackParamList = {
  Home: undefined;
  UpcomingClassScreen: { student_id: number };
  HomeworkScreen: { student_id: number };
  ProgressScreen: { student_id: number };
  ChatRoomList: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BottomBar() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUserId(u.user_id);
      }
    };
    load();
  }, []);

  const current = route.name;

  const tabs = [
    {
      name: "Home",
      label: "Home",
      icon: "home",
      activeIcon: "home",
      params: undefined
    },
    {
      name: "UpcomingClassScreen",
      label: "My Classes",
      icon: "menu-book",
      activeIcon: "menu-book",
      params: { student_id: userId }
    },

    {
      name: "HomeworkScreen",
      label: "Homework",
      icon: "assignment",
      activeIcon: "assignment",
      params: { student_id: userId }
    },
    {
      name: "Progress",
      label: "Progress",
      icon: "assessment",
      activeIcon: "assessment",
      params: { student_id: userId }
    },
    {
      name: "ChatRoomList",
      label: "Chat",
      icon: "chat",
      activeIcon: "chat",
      params: undefined
    }
  ];

  return (
    <View className="flex-row justify-around items-center bg-white border-gray-200 py-3 px-2">
      {tabs.map((tab) => {
        const isActive = current === tab.name;

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() =>
              navigation.navigate(
                tab.name as keyof RootStackParamList,
                tab.params as any
              )
            }
            className="items-center justify-center"
            style={{ flex: 1 }}
          >
            <Icon
              name={isActive ? tab.activeIcon : tab.icon}
              size={24}
              color={isActive ? "#3B82F6" : "#6B7280"}
            />
            <Text
              className="text-xs mt-1"
              style={{
                color: isActive ? "#3B82F6" : "#6B7280",
                fontWeight: isActive ? "600" : "400"
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}