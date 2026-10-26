import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from "../config";
import TutorBottomBar from "./tutorBottomBar";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  HomeworkListPage: { tutor_id: number }; // tutor_id = user_id
  HomeworkDetailsPage: { tutor_id: number; homework_id: number };
  CreateHomeworkPage: { tutor_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Homework = {
  homework_id: number;
  homework_subject: string;
  class_id: number;
  class_name: string;
  due_date: string;
  status: string;
  submitted_count: number;
  total_students: number;
};

export default function HomeworkListPage() {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { tutor_id } = route.params;

  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      fetch(`${API_BASE_URL}/homework/tutor/${tutor_id}/homeworks`)
        .then((res) => {
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data.success && data.homeworks) {
            const hwList: Homework[] = data.homeworks.map((hw: any) => ({
              homework_id: hw.homework_id,
              homework_subject: hw.homework_subject,
              class_id: hw.class_id,
              class_name: hw.class_name || `Class ${hw.class_id}`,
              due_date: hw.due_date,
              status: hw.status || "Pending",
              submitted_count: hw.total_submissions || 0,
              total_students: hw.total_students || 0,
            }));
            setHomeworks(hwList);
          } else {
            setHomeworks([]);
          }
        })
        .catch((err) => {
          console.error("❌ Network error:", err);
          Alert.alert("Error", "Failed to load homework list");
          setHomeworks([]);
        })
        .finally(() => setLoading(false));
    }, [tutor_id])
  );

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
      <View className="px-6 mt-2 mb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-gray-900">My Homework</Text>
        <TouchableOpacity
          className="bg-purple-600 px-3 py-1 rounded-lg"
          onPress={() =>
            navigation.navigate("CreateHomeworkPage", { tutor_id })
          }
        >
          <Text className="text-white font-semibold">+ Create Homework</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
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
                navigation.navigate("HomeworkDetailsPage", {
                  tutor_id,
                  homework_id: hw.homework_id,
                })
              }
            >
              <Text className="text-xl font-bold text-blue-600 mb-1">
                {hw.homework_subject}
              </Text>

              <Text className="text-gray-700 mb-2">
                Class: {hw.class_name}
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

              <Text className="text-gray-600">
                Submitted: {hw.submitted_count}/{hw.total_students}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0">
        <TutorBottomBar />
      </View>
    </SafeAreaView>
  );
}
