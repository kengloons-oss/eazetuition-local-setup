import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from '../config';

type RootStackParamList = {
  TutorHome: undefined;
  ForgotPassword: undefined;
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TutorLogin() {
  const navigation = useNavigation<NavigationProp>();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleTutorLogin = async () => {
    if (!form.email || !form.password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Login Failed", data.error || "Invalid credentials");
        return;
      }

      const user = data.user;

      // Only allow tutors
      if (user.type !== "tutor") {
        Alert.alert("Access Denied", "Only tutors can log in here");
        return;
      }

      // Save user in AsyncStorage
      await AsyncStorage.setItem("user", JSON.stringify(user));

      // Navigate to TutorHome
      navigation.reset({ index: 0, routes: [{ name: "TutorHome" }] });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Text className="text-lg font-bold mb-4">Tutor Login</Text>

        <TextInput
          placeholder="Email"
          value={form.email}
          onChangeText={(t) => handleChange("email", t)}
          keyboardType="email-address"
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        />

        <TextInput
          placeholder="Password"
          value={form.password}
          onChangeText={(t) => handleChange("password", t)}
          secureTextEntry
          className="border border-gray-300 rounded-lg px-4 py-3 mb-2 text-base"
        />

        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text className="text-right text-blue-500 mb-6">
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <Pressable
          onPress={handleTutorLogin}
          className="bg-blue-500 py-3 rounded-lg mb-6"
        >
          <Text className="text-white text-center font-semibold text-base">
            Continue
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
