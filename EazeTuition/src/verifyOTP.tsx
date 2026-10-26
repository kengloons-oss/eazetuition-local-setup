
import { API_BASE_URL } from './config';
import React, { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

type RootStackParamList = {
  VerifyOTP: { email: string };
  SetNewPassword: { email: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VerifyOTP">;
type RouteProps = RouteProp<RootStackParamList, "VerifyOTP">;

export default function VerifyOTP() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { email } = route.params;

  const [otpArr, setOtpArr] = useState(["", "", "", "", ""]);
  const inputs = useRef<TextInput[]>([]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otpArr];
    newOtp[index] = text;
    setOtpArr(newOtp);

    // 自动跳到下一个框
    if (text && index < 4) {
      inputs.current[index + 1].focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otp = otpArr.join("");

    if (otp.length !== 5) {
      Alert.alert("Error", "Please enter 5-digit OTP");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verifyOTP`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailVerify: email, otp_code: otp }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", data.message, [
          { text: "OK", onPress: () => navigation.navigate("SetNewPassword", { email }) },
        ]);
      } else {
        Alert.alert("Error", data.error || "OTP verification failed");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      {/* HEADER */}
      <View className="flex-row items-center mt-2 mb-6">
        <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mt-2 mb-4"
          >
            <Ionicons name="chevron-back" size={20} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold">Check your email</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-2"
      >
        {/* TEXT BLOCK */}
        <View className="mb-6">
          <Text className="text-xl font-bold mb-1">Check your email</Text>
          <Text className="text-gray-500 text-sm leading-5">
            We sent a reset link to {email}{"\n"}
            Enter 5 digit code that mentioned in the email
          </Text>
        </View>

        {/* OTP INPUTS */}
        <View className="flex-row justify-between px-6 mb-8">
          {otpArr.map((item, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref as TextInput;
              }}
              value={item}
              onChangeText={(t) => handleChange(t, index)}
              keyboardType="numeric"
              maxLength={1}
              className="w-12 h-12 border border-gray-300 rounded-lg text-center text-lg"
            />
          ))}
        </View>

        {/* BUTTON */}
        <Pressable onPress={handleVerifyOTP} className="bg-blue-500 py-3 rounded-lg mx-2">
          <Text className="text-white text-center font-semibold">Verify Code</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
