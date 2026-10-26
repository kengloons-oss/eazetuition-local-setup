import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useNavigationState } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppBar from "./components/AppBar";

// Screens
import ParentHomeScreen from "./parent/ParentHomeScree";
import ServiceScreen from "./parent/ServiceScreen";
import TimetableScreen from "./parent/TimetableScreen";
import ChatRoomListScreen from "./ChatRoomLIstScreen";
import ParentProfile from "./parent/ParentProfile";
import ParentNotificationScreen from "./parent/ParentNotificationScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {

  // ✅ Track the current tab dynamically
  const activeRouteName = useNavigationState((state) => {
    const index = state?.routes[state.index]?.state?.index ?? 0;
    const nestedRoute = state?.routes[state.index]?.state?.routeNames?.[index];
    return nestedRoute || state?.routes[state.index]?.name || "ParentHomeScreen";
  });

  const titleMap: Record<string, string> = {
    ParentHomeScreen: "Home",
    TimetableScreen: "Timetable",
    ServiceScreen: "Services",
    ChatRoomListScreen: "Chat Room",
    ProfileScreen: "Profile",
  };

  const currentTitle =
    titleMap[activeRouteName] ||
    activeRouteName.replace(/Screen$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");

  // --------------------------
  // 4) 组件主 UI
  // --------------------------
  return (
    <View style={{ flex: 1 }}>
      {/* Persistent AppBar */}
      <AppBar title={currentTitle} variant="menu" />

      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#007BFF",
          tabBarInactiveTintColor: "gray",
          tabBarStyle: {
            backgroundColor: "#fff",
            height: 80,
            paddingBottom: 40,
            paddingTop: 10,
          },
          tabBarIcon: ({ color, size, focused }) => {
            const iconMap: Record<string, string> = {
              ParentHome: focused ? "home" : "home-outline",
              Timetable: focused ? "calendar" : "calendar-outline",
              Service: focused ? "construct" : "construct-outline",
              Chat: focused ? "chatbubbles" : "chatbubbles-outline",
              ParentProfile: focused ? "person" : "person-outline",
            };

            const iconName = iconMap[route.name] ?? "ellipse-outline";

            return (
              <Ionicons
                name={iconName as keyof typeof Ionicons.glyphMap}
                size={size}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen
          name="ParentHome"
          component={ParentHomeScreen}
          options={{ tabBarLabel: "Home" }}
        />

        <Tab.Screen name="Timetable" component={TimetableScreen} />

        <Tab.Screen name="Service" component={ServiceScreen} />

        <Tab.Screen name="Chat" component={ChatRoomListScreen} />

        <Tab.Screen
          name="ParentNotificationScreen"
          component={ParentNotificationScreen}
          options={{ tabBarLabel: "Profile" }}
        />
      </Tab.Navigator>
    </View>
  );
}
