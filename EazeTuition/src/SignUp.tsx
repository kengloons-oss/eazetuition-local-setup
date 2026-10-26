import { API_BASE_URL } from "./config";
import React, { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignUpScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [form, setForm] = useState({
    name: "",
    email: "",
    tel_no: "",
    password: "",
    confirmPassword: "",
    gender: "M",
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.tel_no || !form.password || !form.confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Account created successfully", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        Alert.alert("Error", data.error || "Signup failed");
      }
    } catch {
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header Tabs */}
        <View className="flex-row justify-between mb-6 border-b border-gray-200">
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text className="pb-2 text-gray-400 text-lg">Log in</Text>
          </TouchableOpacity>
          <Text className="pb-2 text-blue-500 font-semibold border-b-2 border-blue-500 text-lg">
            Sign up
          </Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          
          {/* Title + Info */}
          <Text className="text-2xl font-bold mb-2">Parent Sign Up</Text>
          <Text className="text-gray-500 mb-6 leading-5">
            Please fill in your details below.  
            {"\n"}• Email example: user@example.com  
            {"\n"}• Phone example: +6012-3456789  
            {"\n"}• Password must include uppercase, lowercase & number  
          </Text>

          {/* Name */}
          <TextInput
            placeholder="Full Name"
            value={form.name}
            onChangeText={(t) => handleChange("name", t)}
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          {/* Email */}
          <TextInput
            placeholder="Email (e.g. user@example.com)"
            value={form.email}
            onChangeText={(t) => handleChange("email", t)}
            keyboardType="email-address"
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          {/* Phone */}
          <TextInput
            placeholder="Phone Number (e.g. +6012-3456789)"
            value={form.tel_no}
            onChangeText={(t) => handleChange("tel_no", t)}
            keyboardType="phone-pad"
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          {/* Gender */}
          <View className="border border-gray-300 rounded-xl px-3 py-1 mb-4">
            <Picker
              selectedValue={form.gender}
              onValueChange={(itemValue) => handleChange("gender", itemValue)}
            >
              <Picker.Item label="Male" value="M" />
              <Picker.Item label="Female" value="F" />
            </Picker>
          </View>

          {/* Password */}
          <TextInput
            placeholder="Password"
            value={form.password}
            onChangeText={(t) => handleChange("password", t)}
            secureTextEntry
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          {/* Confirm Password */}
          <TextInput
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChangeText={(t) => handleChange("confirmPassword", t)}
            secureTextEntry
            className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
          />

          {/* Button */}
          <Pressable
            onPress={handleSignup}
            className="bg-blue-600 py-3.5 rounded-xl shadow-sm mb-10"
          >
            <Text className="text-white text-center text-lg font-semibold">
              Create Account
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}
