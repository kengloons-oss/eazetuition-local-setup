import React, { useState } from "react";
import { API_BASE_URL } from './config';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Picker } from "@react-native-picker/picker";

type RootStackParamList = {
  Home: undefined;
  AddStudent: { parent_id: number };
};

type AddStudentRouteProp = RouteProp<RootStackParamList, "AddStudent">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddStudentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddStudentRouteProp>();
  const { parent_id } = route.params;

  const [form, setForm] = useState({
    name: "",
    email: "",
    ic_no: "",
    gender: "M",
    age: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleAddStudent = async () => {
    if (!form.name || !form.email || !form.password || !form.confirmPassword || !form.age || !form.ic_no) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/addStudent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id,
          name: form.name,
          email: form.email,
          gender: form.gender,
          ic_no: form.ic_no,
          age: parseInt(form.age),
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Error", data.error || "Failed to add student");
        return;
      }

      Alert.alert("Success", "Student created", [
        {
          text: "OK",
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: "Home" }],
            });
          },
        },
      ]);
    } catch (err) {
      Alert.alert("Error", "Failed to connect to server");
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>

          <Text className="text-2xl font-bold mb-4">Add Student</Text>

          <TextInput
            placeholder="Full Name"
            value={form.name}
            onChangeText={(t) => handleChange("name", t)}
            className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
          />

          <TextInput
            placeholder="Email"
            value={form.email}
            onChangeText={(t) => handleChange("email", t)}
            keyboardType="email-address"
            className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
          />

          <TextInput
            placeholder="IC Number"
            value={form.ic_no}
            onChangeText={(t) => handleChange("ic_no", t)}
            className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
          />

          {/* Gender Picker */}
          <View className="border border-gray-300 rounded-lg px-2 mb-3">
            <Picker
              selectedValue={form.gender}
              onValueChange={(value) => handleChange("gender", value)}
            >
              <Picker.Item label="Male" value="M" />
              <Picker.Item label="Female" value="F" />
            </Picker>
          </View>

          <TextInput
            placeholder="Age"
            value={form.age}
            onChangeText={(t) => handleChange("age", t)}
            keyboardType="numeric"
            className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
          />

          <TextInput
            placeholder="Password"
            value={form.password}
            onChangeText={(t) => handleChange("password", t)}
            secureTextEntry
            className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
          />

          <TextInput
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChangeText={(t) => handleChange("confirmPassword", t)}
            secureTextEntry
            className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
          />

          <Pressable onPress={handleAddStudent} className="bg-blue-500 py-3 rounded-lg mb-8">
            <Text className="text-white text-center font-semibold text-base">Add Student</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}
