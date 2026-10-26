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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

type RootStackParamList = {
  SetNewPassword: { email: string };
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SetNewPassword"
>;
type RouteProps = RouteProp<RootStackParamList, "SetNewPassword">;

export default function SetNewPassword() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { email } = route.params;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/resetPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", data.message, [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        Alert.alert("Error", data.error || "Password reset failed");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      {/* BACK */}
      <View className="mt-2 mb-5">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mt-2 mb-4">
          <Ionicons name="chevron-back" size={20} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* TITLE */}
        <Text className="text-2xl font-bold mb-2">Set a new password</Text>
        <Text className="text-gray-500 mb-8 w-72 leading-5">
          Create a new password. Ensure it differs from previous ones for security
        </Text>

        {/* PASSWORD FIELD */}
        <Text className="mb-1 font-medium">Password</Text>
        <TextInput
          placeholder=""
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          className="border border-gray-300 rounded-lg px-4 py-3 mb-5"
        />

        <Text className="mb-1 font-medium">Confirm Password</Text>
        <TextInput
          placeholder=""
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          className="border border-gray-300 rounded-lg px-4 py-3 mb-8"
        />

        <Pressable
          onPress={handleResetPassword}
          className="bg-blue-500 py-3 rounded-lg"
        >
          <Text className="text-white text-center font-semibold">
            Update Password
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
