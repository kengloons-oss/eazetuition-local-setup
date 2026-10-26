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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { API_BASE_URL } from "../config"; 
import TutorBottomBar from "./tutorBottomBar";

type RootStackParamList = {
  TutorHome: undefined;
  TutorClassList: undefined;
  ClassAttendance: { class_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type User = {
  user_id: number;
  name: string;
  type: string;
};

type TutorClass = {
  class_id: number;
  session_id: number | null;
  subject_name: string;
  start_datetime: string; // ISO string from backend
  end_datetime: string;   // ISO string from backend
  location: string;
  otp?: string | null;
};

export default function TutorClassList() {
  const navigation = useNavigation<NavigationProp>();
  const [classes, setClasses] = useState<TutorClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) {
          navigation.reset({ index: 0, routes: [{ name: "TutorHome" }] });
          return;
        }

        const u: User = JSON.parse(storedUser);
        setUser(u);

        const res = await fetch(`${API_BASE_URL}/attendance/api/tutor/classes/${u.user_id}`);
        const data = await res.json();

        if (res.ok) {
          const now = new Date();

          const sorted = data.sort((a: TutorClass, b: TutorClass) => {
            const aDate = new Date(a.start_datetime);
            const bDate = new Date(b.start_datetime);

            const aIsFuture = aDate >= now ? 0 : 1;
            const bIsFuture = bDate >= now ? 0 : 1;

            if (aIsFuture !== bIsFuture) return aIsFuture - bIsFuture; // future first
            return aDate.getTime() - bDate.getTime(); // sort within group
          });

          setClasses(sorted);
        } else {
          Alert.alert("No Classes", data.message || "No classes found");
        }
      } catch (err) {
        Alert.alert("Error", "Failed to load classes");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleGenerateOTP = async (session_id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/api/tutor/generate_otp/${session_id}`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        Alert.alert("OTP Generated", `Class OTP: ${data.attendance_code}`);
        // Update OTP in state
        setClasses((prev) =>
          prev.map((c) =>
            c.session_id === session_id ? { ...c, otp: data.attendance_code } : c
          )
        );
      } else {
        Alert.alert("Error", data.error || "Failed to generate OTP");
      }
    } catch (err) {
      Alert.alert("Error", "Unable to connect to server");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="text-gray-500 mt-3">Loading your classes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 px-4 pt-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold text-gray-800">Your Classes</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("TutorHome")}
          className="bg-gray-200 px-3 py-1 rounded-lg"
        >
          <Text>← Back</Text>
        </TouchableOpacity>
      </View>

      {classes.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 text-lg">No classes available.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1">
          {classes.map((cls) => {
            const startDate = new Date(cls.start_datetime);
            const endDate = new Date(cls.end_datetime);

            const formattedDate = startDate.toLocaleDateString("en-GB"); // DD/MM/YYYY
            const startTime = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const endTime = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <View
                key={`${cls.class_id}-${cls.session_id}`}
                className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 mb-4"
              >
                <Text className="text-lg font-semibold text-gray-800">{cls.subject_name}</Text>
                <Text className="text-gray-600 mt-1">
                  📅 {formattedDate} | ⏰ {startTime} - {endTime}
                </Text>
                <Text className="text-gray-600 mt-1">📍 {cls.location}</Text>

                {/* OTP */}
                {cls.otp ? (
                  <View className="mt-3 bg-green-100 px-4 py-2 rounded-lg">
                    <Text className="text-green-700 font-semibold text-center">
                      Current OTP: {cls.otp}
                    </Text>
                  </View>
                ) : cls.session_id ? (
                  <TouchableOpacity
                    className="mt-3 bg-blue-600 px-4 py-2 rounded-xl"
                    onPress={() => handleGenerateOTP(cls.session_id!)}
                  >
                    <Text className="text-white font-semibold text-center">Generate OTP</Text>
                  </TouchableOpacity>
                ) : null}

                {/* View Attendance */}
                <TouchableOpacity
                  className="mt-3 border border-gray-300 px-4 py-2 rounded-xl"
                  onPress={() =>
                    navigation.navigate("ClassAttendance", { class_id: cls.class_id })
                  }
                >
                  <Text className="text-gray-700 text-center font-medium">View Attendance</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0">
        <TutorBottomBar />
      </View>
    </SafeAreaView>
  );
}
