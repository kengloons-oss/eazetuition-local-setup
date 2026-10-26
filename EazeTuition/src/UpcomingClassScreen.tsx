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

type ClassItem = {
  schedule_id: number;
  class_id: number;
  subject_name: string;
  tutor_name: string;
  class_type: string;
  class_detail_id: number;
  start_datetime: string; // ISO string
  end_datetime: string;   // ISO string
};

export default function UpcomingClassScreen({ route, navigation }: any) {
  const { student_id } = route.params;
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/attendance/get_student_classes/${student_id}`);
        const data = await res.json();

        if (data.classes && data.classes.length > 0) {
          // Remove duplicate schedule_ids
          const seen = new Set<number>();
          const filteredClasses = data.classes.filter((c: ClassItem) => {
            if (seen.has(c.schedule_id)) return false;
            seen.add(c.schedule_id);
            return true;
          });

          // Sort by date: upcoming first
          const now = new Date();
          filteredClasses.sort((a: ClassItem, b: ClassItem) => {
            const aTime = new Date(a.start_datetime).getTime();
            const bTime = new Date(b.start_datetime).getTime();
            return aTime - bTime;
          });

          setClasses(filteredClasses);
        } else {
          Alert.alert("No Classes", data.message || "No upcoming classes found.");
        }
      } catch (err) {
        console.error("❌ Network error:", err);
        Alert.alert("Error", "Failed to connect to the server");
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [student_id]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-500 mt-2">Loading upcoming classes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header showBackButton={false} />

      <View className="px-6 mt-2 mb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-gray-900">Upcoming Classes</Text>
      </View>

      <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
        {classes.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Text className="text-gray-500 text-lg">
              No upcoming classes found.
            </Text>
          </View>
        ) : (
          classes.map((cls, idx) => {
            const start = new Date(cls.start_datetime);
            const end = new Date(cls.end_datetime);

            const formattedDate = start.toLocaleDateString("en-GB"); // DD/MM/YYYY
            const startTime = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const endTime = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <TouchableOpacity
                key={`${cls.class_id}-${cls.schedule_id}`}
                activeOpacity={0.8}
                className="bg-gray-50 rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm"
                onPress={() =>
                  navigation.navigate("ClassDetailScreen", {
                    class_id: cls.class_id,
                    class_detail_id: cls.class_detail_id,
                    schedule_id: cls.schedule_id,
                    student_id: student_id,
                  })
                }
              >
                {/* Subject Name */}
                <Text className="text-xl font-bold text-blue-600 mb-2">
                  {cls.subject_name}
                </Text>

                {/* Tutor and Type */}
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-700 font-semibold">{cls.tutor_name}</Text>

                  <View
                    className={`px-3 py-1 rounded-full ${
                      cls.class_type.toLowerCase() === "group"
                        ? "bg-green-100"
                        : "bg-yellow-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        cls.class_type.toLowerCase() === "group"
                          ? "text-green-700"
                          : "text-yellow-700"
                      }`}
                    >
                      {cls.class_type}
                    </Text>
                  </View>
                </View>

                {/* Schedule Info */}
                <View className="mt-1">
                  <Text className="text-gray-600">
                    <Text className="font-semibold">Date: </Text>
                    {formattedDate}
                  </Text>
                  <Text className="text-gray-600">
                    <Text className="font-semibold">Time: </Text>
                    {startTime} - {endTime}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0">
        <BottomBar />
      </View>
    </SafeAreaView>
  );
}
