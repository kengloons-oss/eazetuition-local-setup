import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from "./config";
import Header from "./Header";
import BottomBar from "./BottomBar";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  HomeworkScreen: { student_id: number };
  HomeworkDetailsScreen: { student_id: number; homework_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Homework = {
  homework_id: number;
  homework_subject: string;
  due_date: string;
  status: string;
  grade?: string | null;
};

export default function HomeworkScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { student_id } = route.params;

  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHomeworks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/homework/student/homework/${student_id}/list`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setHomeworks(data.homeworks || []);
    } catch (err) {
      console.error("❌ Network error:", err);
      Alert.alert("Error", "Failed to load homework list");
      setHomeworks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh homework list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHomeworks();
    }, [student_id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeworks();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-500 mt-2">Loading homework...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header showBackButton={false} />

      <View className="px-6 mt-2 mb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-gray-900">My Homework</Text>
      </View>

      <ScrollView
        className="px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 300 }}
      >
        {homeworks.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Text className="text-gray-500 text-lg">No homework assigned</Text>
          </View>
        ) : (
          homeworks.map((hw) => (
            <TouchableOpacity
              key={hw.homework_id}
              activeOpacity={0.8}
              className="bg-gray-50 rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm"
              onPress={() =>
                navigation.navigate("HomeworkDetailsScreen", {
                  student_id,
                  homework_id: hw.homework_id,
                })
              }
            >
              <Text className="text-xl font-bold text-blue-600 mb-2">
                {hw.homework_subject}
              </Text>

              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-700">Due: {hw.due_date}</Text>
                <View
                  className={`px-3 py-1 rounded-full ${
                    hw.status.toLowerCase() === "completed"
                      ? "bg-green-100"
                      : hw.status.toLowerCase() === "pending"
                      ? "bg-yellow-100"
                      : "bg-red-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      hw.status.toLowerCase() === "completed"
                        ? "text-green-700"
                        : hw.status.toLowerCase() === "pending"
                        ? "text-yellow-700"
                        : "text-red-700"
                    }`}
                  >
                    {hw.status}
                  </Text>
                </View>
              </View>

              {hw.grade && (
                <Text className="text-gray-600">
                  <Text className="font-semibold">Grade: </Text>
                  {hw.grade}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0">
        <BottomBar />
      </View>
    </SafeAreaView>
  );
}
