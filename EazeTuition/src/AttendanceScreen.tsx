import React, { useRef, useState } from "react";
import { API_BASE_URL } from './config';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import BottomBar from "./BottomBar";
import Header from "./Header";

type RootStackParamList = {
  AttendanceScreen: { student_id: number; class_id: number; schedule_id: number};
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AttendanceScreen"
>;
type RouteProps = RouteProp<RootStackParamList, "AttendanceScreen">;

export default function AttendanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { student_id, class_id, schedule_id } = route.params;

  const [otpArr, setOtpArr] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<TextInput[]>([]);

  // Update OTP array and focus next input
  const handleChange = (text: string, index: number) => {
    // Only take the first digit
    const value = text.slice(0, 1);

    const newOtp = [...otpArr];
    newOtp[index] = value;
    setOtpArr(newOtp);

    // Move to next box
    if (value && index < otpArr.length - 1) {
      setTimeout(() => {
        inputs.current[index + 1]?.focus();
      }, 50); // small delay fixes Android auto-focus issue
    }
  };

  // Handle backspace to move focus back
  const handleKeyPress = (e: any, index: number) => {
  if (e.nativeEvent.key === "Backspace") {
    const newOtp = [...otpArr];

    // If current box has a value, clear it
    if (newOtp[index]) {
      newOtp[index] = "";
      setOtpArr(newOtp);
    } else if (index > 0) {
      // Move to previous box if current is empty
      inputs.current[index - 1]?.focus();

      // Also clear the previous box
      newOtp[index - 1] = "";
      setOtpArr(newOtp);
    }
  }
};

  // Submit attendance
  const handleMarkAttendance = async () => {
    const code = otpArr.join("");

    if (code.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/attendance/mark_attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id,
          schedule_id,
          attendance_code: code,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert("Success", data.message || "Attendance marked successfully", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", data.message || "Attendance failed");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to connect to the server");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <Header showBackButton={true}/>
      <View className="flex-row items-center mt-2 mb-6">
        <Text className="text-lg font-semibold">Mark Attendance</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-2"
      >
        {/* Instructions */}
        <View className="mb-6">
          <Text className="text-xl font-bold mb-1">Enter Attendance Code</Text>
          <Text className="text-gray-500 text-sm leading-5">
            Enter the 6-digit code provided by your tutor to mark your attendance.
          </Text>
        </View>

        {/* OTP Inputs */}
        <View className="flex-row justify-between px-6 mb-8">
          {otpArr.map((item, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref as TextInput;
              }}
              value={item}
              onChangeText={(t) => handleChange(t, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              className="w-12 h-12 border border-gray-300 rounded-lg text-center text-lg"
            />
          ))}
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleMarkAttendance}
          className="bg-blue-500 py-3 rounded-lg mx-2"
        >
          <Text className="text-white text-center font-semibold">
            Mark Attendance
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
      <View className="absolute bottom-0 left-0 right-0">
        <BottomBar />
      </View>
    </SafeAreaView>
  );
}
