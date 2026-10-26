import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { API_BASE_URL } from "../config";

type RootStackParamList = {
  TutorClassList: undefined;
  ClassAttendance: { class_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type AttendanceRecord = {
  student_id: number;
  student_name: string;
  timestamp?: string;
  status: string;
};

export default function ClassAttendance() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const { class_id } = route.params as { class_id: number };

  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/attendance/api/tutor/class_attendance/${class_id}`);
        const data = await res.json();

        if (res.ok) {
          setAttendanceList(data);
        } else {
          Alert.alert("No Records", data.message || "No attendance data found");
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Unable to fetch attendance records");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [class_id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="text-gray-500 mt-3">Loading attendance...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-4 pt-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold text-gray-800">Class Attendance</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-gray-200 px-3 py-1 rounded-lg"
        >
          <Text>← Back</Text>
        </TouchableOpacity>
      </View>

      {attendanceList.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 text-lg">No students found.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1">
          {attendanceList.map((record) => (
            <View
              key={record.student_id}
              className="flex-row justify-between items-center border-b border-gray-200 py-3"
            >
              <View>
                <Text className="text-lg font-medium text-gray-800">
                  {record.student_name}
                </Text>
                {record.timestamp && (
                  <Text className="text-gray-500 text-sm">
                    Marked at: {record.timestamp}
                  </Text>
                )}
              </View>

              <View
                className={`px-3 py-1 rounded-lg ${
                  record.status.toLowerCase() === "present"
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                <Text
                  className={`font-semibold ${
                    record.status.toLowerCase() === "present"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {record.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
