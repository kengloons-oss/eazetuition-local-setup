import { API_BASE_URL } from './config';
import React, { useEffect, useState } from "react";
import {
  View, Text, Image, ActivityIndicator,
  Alert, TouchableOpacity, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "./Header"; 
import BottomBar from "./BottomBar";

type Profile = {
  user_id: number;
  name: string;
  email: string;
  ic_no: string;
  gender: string;
  address?: string;
  type: string;
  profile_pic?: string;
  tel_no?: string;
  occupation?: string;
  students?: number[];
  age?: number;
  payment_status?: string;
  position?: string;
};

export default function ProfileScreen({ route, navigation }: any) {
  const { user_id } = route.params;
  const [profile, setProfile] = useState<Profile | null>(null);
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
      <Header showBackButton={true} />
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6">
          <View className="flex-row justify-between items-center mb-6 mt-2">
            <Text className="text-2xl font-bold text-gray-900">Profile</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("UpdateProfile", { profile })}
              className="bg-blue-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Image */}
          <View className="items-center mb-8">
            {profile?.profile_pic ? (
              <Image 
                source={{ uri: profile.profile_pic }} 
                className="w-32 h-32 rounded-full border-4 border-gray-200" 
              />
            ) : (
              <View className="w-32 h-32 rounded-full bg-gray-200 border-4 border-gray-300 items-center justify-center">
                <Text className="text-gray-500">No Photo</Text>
              </View>
            )}
          </View>

          {/* Profile Information */}
          <View className="bg-gray-50 rounded-2xl p-6 mb-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">Basic Information</Text>
            
            <View className="space-y-4">
              <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                <Text className="text-gray-600 font-medium">Name</Text>
                <Text className="text-gray-800 font-semibold">{profile?.name}</Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                <Text className="text-gray-600 font-medium">Email</Text>
                <Text className="text-gray-800 font-semibold">{profile?.email}</Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                <Text className="text-gray-600 font-medium">IC Number</Text>
                <Text className="text-gray-800 font-semibold">{profile?.ic_no}</Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                <Text className="text-gray-600 font-medium">Gender</Text>
                <Text className="text-gray-800 font-semibold">{profile?.gender}</Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                <Text className="text-gray-600 font-medium">Role</Text>
                <Text className="text-gray-800 font-semibold capitalize">{profile?.type}</Text>
              </View>
              
              {profile?.address && (
                <View className="flex-row justify-between items-start py-2 border-b border-gray-200">
                  <Text className="text-gray-600 font-medium flex-1">Address</Text>
                  <Text className="text-gray-800 font-semibold flex-2 text-right">{profile.address}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Additional Information */}
          {(profile?.tel_no || profile?.occupation || profile?.age || profile?.position) && (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <Text className="text-xl font-bold text-gray-800 mb-4">Additional Information</Text>
              
              <View className="space-y-4">
                {profile?.tel_no && (
                  <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                    <Text className="text-gray-600 font-medium">Phone</Text>
                    <Text className="text-gray-800 font-semibold">{profile.tel_no}</Text>
                  </View>
                )}
                
                {profile?.occupation && (
                  <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                    <Text className="text-gray-600 font-medium">Occupation</Text>
                    <Text className="text-gray-800 font-semibold">{profile.occupation}</Text>
                  </View>
                )}
                
                {profile?.age && (
                  <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                    <Text className="text-gray-600 font-medium">Age</Text>
                    <Text className="text-gray-800 font-semibold">{profile.age} years old</Text>
                  </View>
                )}
                
                {profile?.position && (
                  <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
                    <Text className="text-gray-600 font-medium">Position</Text>
                    <Text className="text-gray-800 font-semibold">{profile.position}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Students Information (if applicable) */}
          {profile?.students && profile.students.length > 0 && (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <Text className="text-xl font-bold text-gray-800 mb-4">Students</Text>
              <View className="bg-white rounded-xl p-4">
                <Text className="text-gray-800">
                  {profile.students.join(", ")}
                </Text>
              </View>
            </View>
          )}

          {/* Payment Status (if applicable) */}
          {profile?.payment_status && (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <Text className="text-xl font-bold text-gray-800 mb-4">Payment Status</Text>
              <View className={`rounded-xl p-4 ${
                profile.payment_status === 'paid' ? 'bg-green-100' : 
                profile.payment_status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Text className={`font-semibold text-center ${
                  profile.payment_status === 'paid' ? 'text-green-800' : 
                  profile.payment_status === 'pending' ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {profile.payment_status.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        <View className="h-100" />
      </ScrollView>
      
      <View className="absolute bottom-0 left-0 right-0">
        <BottomBar/>
      </View>
    </SafeAreaView>
  );
}