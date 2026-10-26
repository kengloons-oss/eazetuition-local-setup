// TutorBottomBar.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/MaterialIcons";

type RootStackParamList = {
  TutorHome: undefined;
  TutorClassList: { tutor_id: number };
  HomeworkListPage: { tutor_id: number };
  TutorProfile: { user_id: number };
  ChatRoomList: undefined;
  TutorTimeTable: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TutorBottomBar() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [tutorId, setTutorId] = useState<number | null>(null);
  const resetRoutes = ["ChatRoomList", "TutorTimetable"];

  useEffect(() => {
    const load = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setTutorId(u.user_id);
      }
    };
    load();
  }, []);

  const current = route.name;

  const tabs = [
    {
      name: "TutorHome",
      label: "Home",
      icon: "home",
      activeIcon: "home",
      params: undefined,
    },
    {
      name: "TutorClassList",
      label: "Classes",
      icon: "menu-book",
      activeIcon: "menu-book",
      params: { tutor_id: tutorId },
    },
    {
      name: "TutorTimetable",
      label: "Timetable",
      icon: "calendar-today",
      activeIcon: "calendar-today",
      params: undefined
    },
    {
      name: "HomeworkListPage",
      label: "Homework",
      icon: "assignment",
      activeIcon: "assignment",
      params: { tutor_id: tutorId },
    },
    {
      name: "ChatRoomList",
      label: "Chat",
      icon: "chat",
      activeIcon: "chat",
      params: undefined
    },
    {
      name: "TutorProfile",
      label: "Profile",
      icon: "person",
      activeIcon: "person",
      params: { user_id: tutorId },
    },
  ];

  return (
    <View className="flex-row justify-around items-center bg-white border-gray-200 py-3">
      {tabs.map((tab) => {
        const isActive = current === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => {
              if (resetRoutes.includes(tab.name)) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: tab.name as keyof RootStackParamList, params: tab.params }],
                });
              } else {
                navigation.navigate(
                  tab.name as keyof RootStackParamList,
                  tab.params as any
                );
              }
            }}
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
                fontWeight: isActive ? "600" : "400",
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
