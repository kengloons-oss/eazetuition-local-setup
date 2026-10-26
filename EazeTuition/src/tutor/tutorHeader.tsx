// TutorHeader.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
  TutorHome: undefined;
  TutorProfile: { user_id: number };
  Settings: undefined;
  TutorNotifications: undefined;
  TutorClassList: { tutor_id: number };
  HomeworkListPage: { tutor_id: number };
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export default function TutorHeader({ title, showBackButton = false }: HeaderProps) {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = useState<{ name: string; user_id: number; type: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);

        if (u.type !== "tutor") {
          alert("Access denied");
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          return;
        }
        setUser(u);
      } else {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    };
    loadUser();
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem("user");
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  if (!user) return null;

  return (
    <View className="flex-row justify-between items-center px-6 pt-4 pb-4 bg-white">
      <View className="flex-1">
        {showBackButton ? (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#3b82f6" />
          </TouchableOpacity>
        ) : (
          <Text className="text-xl font-bold">Welcome, {user.name}</Text>
        )}
      </View>

      <View>
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
          <Image
            source={require("../../assets/images/avatar.jpg")}
            className="w-10 h-10 rounded-full"
          />
        </TouchableOpacity>

        {showMenu && (
          <View className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-md z-50">
            <TouchableOpacity
              className="px-4 py-3 border-b border-gray-200"
              onPress={() => {
                setShowMenu(false);
                navigation.navigate("TutorProfile", { user_id: user.user_id });
              }}
            >
              <Text>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="px-4 py-3 border-b border-gray-200"
              onPress={() => {
                setShowMenu(false);
                navigation.navigate("Settings");
              }}
            >
              <Text>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="px-4 py-3 border-b border-gray-200"
              onPress={() => {
                setShowMenu(false);
                navigation.navigate("TutorNotifications");
              }}
            >
              <Text>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity className="px-4 py-3" onPress={logout}>
              <Text className="text-red-500 font-bold">Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
