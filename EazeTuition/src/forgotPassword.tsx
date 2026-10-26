import { API_BASE_URL } from './config';
import React, { useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

type RootStackParamList = {
  VerifyOTP: { email: string };
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState("");

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgotPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", "OTP sent to your email", [
          {
            text: "OK",
            onPress: () => navigation.navigate("VerifyOTP", { email }),
          },
        ]);
      } else {
        Alert.alert("Error", data.error || "Failed to send OTP");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      {/* Back Arrow */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mt-2 mb-4"
      >
        <Ionicons name="chevron-back" size={20} />
      </TouchableOpacity>

      {/* Title */}
      <Text className="text-2xl font-bold mb-2">Forgot password</Text>
      <Text className="text-gray-500 mb-6">
        Please enter your email to reset the password
      </Text>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Email Label */}
        <Text className="mb-1 font-medium">Your Email</Text>
        <TextInput
          placeholder="example@gmail.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          className="border border-gray-300 rounded-lg px-4 py-3 mb-5"
        />

        <Pressable
          onPress={handleSendOTP}
          className="bg-blue-500 py-3 rounded-lg"
        >
          <Text className="text-white text-center font-semibold">
            Reset Password
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
