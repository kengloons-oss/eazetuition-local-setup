// TutorProfile.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TutorBottomBar from "./tutorBottomBar";
import { API_BASE_URL } from "../config";

type TutorProfileType = {
  user_id: number;
  name: string;
  email: string;
  gender: string;
  tel_no?: string;
  address?: string;
  profile_pic?: string;
  occupation?: string;
  position?: string;
};

export default function TutorProfile({ route, navigation }: any) {
  const { user_id } = route.params;
  const [profile, setProfile] = useState<TutorProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/profileDisplay?user_id=${user_id}`)
      .then((res) => res.json())
      .then((data) => setProfile(data.profile))
      .catch(() => Alert.alert("Error", "Server connection failed"))
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
      <ScrollView className="flex-1 px-6">
        <View className="flex-row justify-between items-center mb-6 mt-2">
          <Text className="text-2xl font-bold text-gray-900">Tutor Profile</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("TutorUpdateProfile", { profile })}
            className="bg-blue-500 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold">Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View className="items-center mb-8">
          {profile?.profile_pic ? (
            <Image source={{ uri: profile.profile_pic }} className="w-32 h-32 rounded-full border-4 border-gray-200" />
          ) : (
            <View className="w-32 h-32 rounded-full bg-gray-200 border-4 border-gray-300 items-center justify-center">
              <Text className="text-gray-500">No Photo</Text>
            </View>
          )}
        </View>

        {/* Basic Info */}
        <View className="bg-gray-50 p-6 rounded-2xl mb-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">Basic Information</Text>

          {[
            { label: "Name", value: profile?.name },
            { label: "Email", value: profile?.email },
            { label: "Gender", value: profile?.gender },
            { label: "Position", value: profile?.position },
          ].map(
            (item, idx) =>
              item.value && (
                <View
                  key={idx}
                  className="flex-row justify-between py-2 border-b border-gray-200"
                >
                  <Text className="text-gray-600">{item.label}</Text>
                  <Text className="text-gray-800 font-semibold">{item.value}</Text>
                </View>
              )
          )}
        </View>

        {/* Additional Info */}
        {(profile?.tel_no || profile?.address || profile?.occupation) && (
          <View className="bg-gray-50 p-6 rounded-2xl mb-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">Additional Information</Text>

            {profile?.tel_no && (
              <View className="flex-row justify-between py-2 border-b border-gray-200">
                <Text className="text-gray-600">Phone</Text>
                <Text className="text-gray-800">{profile.tel_no}</Text>
              </View>
            )}

            {profile?.address && (
              <View className="flex-row justify-between py-2 border-b border-gray-200">
                <Text className="text-gray-600">Address</Text>
                <Text className="text-gray-800 text-right flex-1 ml-6">{profile.address}</Text>
              </View>
            )}

            {profile?.occupation && (
              <View className="flex-row justify-between py-2 border-b border-gray-200">
                <Text className="text-gray-600">Occupation</Text>
                <Text className="text-gray-800">{profile.occupation}</Text>
              </View>
            )}
          </View>
        )}

        <View className="h-24" />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0">
        <TutorBottomBar />
      </View>
    </SafeAreaView>
  );
}
