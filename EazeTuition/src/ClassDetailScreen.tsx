import { API_BASE_URL } from './config';
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "./Header";
import BottomBar from "./BottomBar";
import { useRoute, useNavigation } from "@react-navigation/native";

type RootStackParamList = {
  ClassDetailScreen: { class_id: number; class_detail_id:number; schedule_id: number; student_id: number };
  AttendanceScreen: { schedule_id: number; student_id: number };
  MCReasonScreen: { class_id: number; student_id: number };
};

interface ClassDetail {
  class_detail_id: number;
  class_id: number;
  subject: string;
  tutor: string;
  class_type?: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  status: string;
}

export default function ClassDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // ✅ schedule_id now automatically comes from UpcomingClassScreen
  const { class_id, class_detail_id,student_id, schedule_id } = route.params;

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  useEffect(() => {
    fetchClassDetail();
  }, []);

  const fetchClassDetail = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/class_detail/${class_detail_id}`
      );
      const data = await response.json();

      if (response.ok) {
        setClassDetail(data);
      } else {
        Alert.alert("Error", data.message || "Failed to fetch class details.");
      }
    } catch (error) {
      console.error("Error fetching class details:", error);
      Alert.alert("Error", "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAttendance = () => {
    navigation.navigate("AttendanceScreen", {
      schedule_id,   // ✅ USE AUTO schedule_id
      student_id,
    });
  };


  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!classDetail) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text>No class details found.</Text>
      </View>
    );
  }

  const classType = (classDetail.class_type ?? "Group").toLowerCase();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header showBackButton={true} />

      <View className="px-6 mt-2 mb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-gray-900">Class Details</Text>
      </View>

      <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
        <View className="bg-gray-50 rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm">

          {/* Subject */}
          <Text className="text-xl font-bold text-blue-600 mb-2">
            {classDetail.subject}
          </Text>

          {/* Tutor */}
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-700 font-semibold">{classDetail.tutor}</Text>

            <View
              className={`px-3 py-1 rounded-full ${
                classType === "group" ? "bg-green-100" : "bg-yellow-100"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  classType === "group" ? "text-green-700" : "text-yellow-700"
                }`}
              >
                {classDetail.class_type ?? "Group"}
              </Text>
            </View>
          </View>

          {/* Schedule */}
          <View className="mt-1 space-y-1">
            <Text className="text-gray-600">
              <Text className="font-semibold">Day: </Text>
              {classDetail.day_of_week}
            </Text>
            <Text className="text-gray-600">
              <Text className="font-semibold">Time: </Text>
              {classDetail.start_time} - {classDetail.end_time}
            </Text>
            <Text className="text-gray-600">
              <Text className="font-semibold">Room: </Text>
              {classDetail.room ?? "N/A"}
            </Text>
          </View>

          {/* Buttons */}
          <View className="flex-row justify-between mt-4 space-x-3">
            <TouchableOpacity
              className="flex-1 bg-blue-600 py-3 rounded-lg"
              onPress={handleTakeAttendance}
            >
              <Text className="text-center text-white font-semibold">
                Take Attendance
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0">
        <BottomBar />
      </View>
    </SafeAreaView>
  );
}
