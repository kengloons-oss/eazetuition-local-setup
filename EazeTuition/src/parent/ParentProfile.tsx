// ParentProfile.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { API_BASE_URL } from "../config";

type ParentProfileType = {
  user_id: number;
  name: string;
  email: string;
  gender: string;
  tel_no?: string;
  address?: string;
  profile_pic?: string;
  occupation?: string;
  type?: string;
};

export default function ParentProfile({ }: any) {
  // const { user_id } = route.params;
  const [profile, setProfile] = useState<ParentProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  const [user_id, setUserId] = useState<number | null>(null);
  type Nav = NativeStackNavigationProp<RootStackParamList>;
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    const load = async () => {
      const raw = await AsyncStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setUserId(u.user_id);
      }
    };
    load();
  }, []);


  useEffect(() => {
    if (!user_id) return;
    fetch(`${API_BASE_URL}/auth/profileDisplay?user_id=${user_id}`)
      .then((res) => res.json())
      .then((data) => setProfile(data.profile))
      .catch(() => Alert.alert("Error", "Failed to connect to server"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">

      <ScrollView className="px-6 mt-4">

        {/* Title + Edit */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900">Parent Profile</Text>
          <TouchableOpacity
            className="bg-blue-500 px-4 py-2 rounded-lg"
            onPress={() => navigation.navigate("ParentUpdateProfile", { profile })}
          >
            <Text className="text-white font-semibold">Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Picture */}
        <View className="items-center mb-8">
          {profile?.profile_pic ? (
            <Image source={{ uri: profile.profile_pic }} className="w-32 h-32 rounded-full border-4 border-gray-200" />
          ) : (
            <View className="w-32 h-32 bg-gray-200 rounded-full items-center justify-center">
              <Text className="text-gray-600">No Photo</Text>
            </View>
          )}
        </View>

        {/* Basic Info */}
        <View className="bg-gray-50 p-6 rounded-2xl mb-6">
          <Text className="text-xl font-bold mb-4 text-gray-800">Basic Information</Text>

          {[
            { label: "Name", value: profile?.name },
            { label: "Email", value: profile?.email },
            { label: "Gender", value: profile?.gender },
          ].map((item, i) =>
            item.value && (
              <View key={i} className="flex-row justify-between py-2 border-b border-gray-200">
                <Text className="text-gray-600">{item.label}</Text>
                <Text className="text-gray-800 font-semibold">{item.value}</Text>
              </View>
            )
          )}
        </View>

        {/* Additional Info */}
        <View className="bg-gray-50 p-6 rounded-2xl mb-6">
          <Text className="text-xl font-bold mb-4 text-gray-800">Additional Information</Text>

          {profile?.tel_no && (
            <View className="flex-row justify-between py-2 border-b border-gray-200">
              <Text className="text-gray-600">Phone</Text>
              <Text className="text-gray-800">{profile.tel_no}</Text>
            </View>
          )}

          {profile?.occupation && (
            <View className="flex-row justify-between py-2 border-b border-gray-200">
              <Text className="text-gray-600">Occupation</Text>
              <Text className="text-gray-800">{profile.occupation}</Text>
            </View>
          )}

          {profile?.address && (
            <View className="py-2 border-b border-gray-200">
              <Text className="text-gray-600 mb-1">Address</Text>
              <Text className="text-gray-800">{profile.address}</Text>
            </View>
          )}
        </View>

        <View className="h-24" />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0">
      </View>
    </SafeAreaView>
  );
}
