import { API_BASE_URL } from './config';
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
  Button,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from './Header';
import BottomBar from "./BottomBar";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Profile: { user_id: number };
  SettingsScreen: undefined;
  Notifications: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Announcement = {
  announcement_id: number;
  title: string;
  content: string;
  created_at: string;
  expiry_at: string;
  target_role: string;
};

export default function NotificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = useState<{ user_id: number; name: string } | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isFocused = useIsFocused();

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setUser(u);
        } else {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load user data");
      }
    };
    loadUser();
  }, []);

  // Fetch announcements
  const fetchAnnouncements = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/announcement/receive/${id}`);
      const data = await res.json();
      if (data.error) {
        Alert.alert("Error", data.error);
      } else {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchAnnouncements(user.user_id);
  }, [user, isFocused]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user");
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchAnnouncements(user.user_id);
    setRefreshing(false);
  };

  const openModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedAnnouncement(null);
    setModalVisible(false);
  };

  if (!user || loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
        <Text className="text-gray-600 mt-3">{!user ? "Loading user..." : "Loading announcements..."}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header showBackButton= {true}/>
      <View className="px-6 mt-2 mb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-gray-900">Announcement</Text>
      </View>
      <ScrollView
        className="px-6 mb-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {announcements.length === 0 ? (
          <View className="items-center mt-10">
            <Text className="text-gray-600 text-lg">No announcements yet.</Text>
          </View>
        ) : (
          announcements.map((item) => (
            <TouchableOpacity
              key={item.announcement_id}
              activeOpacity={0.8}
              className="bg-gray-50 mb-4 rounded-2xl p-5 border border-gray-200 shadow-sm"
              onPress={() => openModal(item)}
            >
              <Text className="text-xl font-bold text-gray-900 mb-1">{item.title}</Text>
              <Text className="text-gray-700 mb-3" numberOfLines={2}>{item.content}</Text>
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-sm">📅 {item.created_at.split(" ")[0]}</Text>
                <Text className="text-gray-500 text-sm">🎯 {item.target_role.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <SafeAreaView className="flex-1 justify-center items-center bg-black/40 px-6">
          <View className="bg-white rounded-2xl p-5 w-full">
            <Text className="text-2xl font-bold text-gray-900 mb-3">
              {selectedAnnouncement?.title}
            </Text>
            <Text className="text-gray-700 mb-3">{selectedAnnouncement?.content}</Text>
            <Text className="text-gray-500 mb-1">
              Created at: {selectedAnnouncement?.created_at.split(" ")[0]}
            </Text>
            <Text className="text-gray-500 mb-3">
              Expiry: {selectedAnnouncement?.expiry_at.split(" ")[0]}
            </Text>
            <Text className="text-gray-500 mb-3">
              Target: {selectedAnnouncement?.target_role.toUpperCase()}
            </Text>

            <Button title="Close" onPress={closeModal} />
          </View>
        </SafeAreaView>
      </Modal>

      <View className="absolute bottom-0 left-0 right-0">
        <BottomBar />
      </View>
    </SafeAreaView>
  );
}
