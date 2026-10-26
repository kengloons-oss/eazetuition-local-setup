import { API_BASE_URL } from './config';
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  AddStudent: { parent_id: number };
  EvaluationTestScreen: { student_id: number };
  ForgotPassword: undefined;
  TutorLogin: undefined;
  MainTabs: undefined;
  TutorHome: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleLogin = async () => {
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

      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      const user = data.user;

      if (user.type === "parent") {
        if (user.students.length === 0) {

          navigation.reset({
            index: 0,
            routes: [{ name: "AddStudent", params: { parent_id: user.parent_id } }],
          });
        } else {
          navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
        }
      } else if (user.type === "student") {
        // ✅ 判断是否完成第一次测验
        try {
          const testCheckRes = await axios.get(
            `${API_BASE_URL}/evaluation/check_first_test?student_id=${user.student_id}`
          );

          const hasDoneFirstTest = testCheckRes.data.done;

          if (!hasDoneFirstTest) {
            navigation.reset({
              index: 0,
              routes: [{ name: "EvaluationTestScreen", params: { student_id: user.student_id } }],
            });
          } else {
            navigation.reset({ index: 0, routes: [{ name: "Home" }] });
          }
        } catch (err) {
          console.error("Check first test error:", err);
          Alert.alert("Error", "Failed to check first test status");
        }
      } else if (user.type === "tutor") {
        navigation.reset({ index: 0, routes: [{ name: "TutorHome" }] });
      } else {
        Alert.alert("Error", "Unknown user type");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      {/* Header */}
      <View className="flex-row justify-between mb-6 border-b border-gray-200">
        <Text className="pb-2 text-blue-500 font-semibold border-b-2 border-blue-500 text-lg">
          Log in
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
          <Text className="pb-2 text-gray-400 text-lg">Sign up</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Text className="text-lg font-bold mb-4">Welcome Back</Text>

        {/* Email */}
        <TextInput
          placeholder="Email"
          value={form.email}
          onChangeText={(t) => handleChange("email", t)}
          keyboardType="email-address"
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        />

        {/* Password */}
        <TextInput
          placeholder="Password"
          value={form.password}
          onChangeText={(t) => handleChange("password", t)}
          secureTextEntry
          className="border border-gray-300 rounded-lg px-4 py-3 mb-2 text-base"
        />

        {/* Forgot Password */}
        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text className="text-right text-blue-500 mb-6">
            Forgot Password?
          </Text>
        </TouchableOpacity>

        {/* Continue Button */}
        <Pressable
          onPress={handleLogin}
          className="bg-blue-500 py-3 rounded-lg mb-6"
        >
          <Text className="text-white text-center font-semibold text-base">
            Continue
          </Text>
        </Pressable>

        {/* Tutor Login Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate("TutorLogin")}
          className="bg-gray-200 py-3 rounded-lg mb-6"
        >
          <Text className="text-center text-gray-700 font-semibold text-base">
            Tutor Login
          </Text>
        </TouchableOpacity>


        {/* Footer */}
        <Text className="text-center text-gray-500 mt-4">
          Don’t have an account?{" "}
          <Text
            className="text-blue-500"
            onPress={() => navigation.navigate("SignUp")}
          >
            Sign up
          </Text>
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
