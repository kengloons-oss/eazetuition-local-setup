// ParentUpdateProfile.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../config";

export default function ParentUpdateProfile({ route, navigation }: any) {
  const { profile } = route.params;

  const [form, setForm] = useState({
    user_id: profile.user_id,
    name: profile.name,
    gender: profile.gender,
    address: profile.address || "",
    tel_no: profile.tel_no || "",
    occupation: profile.occupation || "",
    profile_pic: profile.profile_pic || "",
  });

  const [imageUri, setImageUri] = useState(form.profile_pic);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageSource, setImageSource] = useState<"base64" | "url">("base64");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile.profile_pic?.startsWith("http")) {
      setImageSource("url");
    } else if (profile.profile_pic?.startsWith("data:")) {
      setImageSource("base64");
    }
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setForm({
        ...form,
        profile_pic: `data:image/jpeg;base64,${asset.base64}`,
      });
      setImageSource("base64");
      setImageModalVisible(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const payload = {
        user_id: form.user_id,
        name: form.name,
        gender: form.gender,
        address: form.address,
        tel_no: form.tel_no,
        occupation: form.occupation,
        profile_pic: form.profile_pic,
        type: "parent",
      };

      const res = await fetch(`${API_BASE_URL}/auth/updateProfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert("Success", "Profile updated", [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("ParentProfile", { user_id: form.user_id }),
          },
        ]);
      } else {
        Alert.alert("Error", data.error || "Update failed");
      }
    } catch (err) {
      Alert.alert("Error", "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <ScrollView>
        <Text className="text-2xl font-bold mt-4 mb-6">Update Profile</Text>

        {/* Profile Picture */}
        <View className="items-center mb-6">
          <Image
            source={imageUri ? { uri: imageUri } : require("../../assets/images/avatar.jpg")}
            className="w-32 h-32 rounded-full border-2 border-gray-300"
          />

          <TouchableOpacity
            onPress={() => setImageModalVisible(true)}
            className="bg-blue-500 px-6 py-3 mt-4 rounded-lg"
          >
            <Text className="text-white font-bold">Change Picture</Text>
          </TouchableOpacity>
        </View>

        {/* Modal for Image Source */}
        <Modal visible={imageModalVisible} transparent animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white w-80 rounded-2xl p-6">
              <Text className="text-xl font-bold mb-4 text-center">
                Choose Image
              </Text>

              <TouchableOpacity
                onPress={pickImage}
                className="bg-blue-500 py-4 rounded-lg mb-2"
              >
                <Text className="text-white text-center font-bold">
                  Choose from Gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setImageModalVisible(false)}
                className="bg-gray-500 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Basic Info */}
        <View className="mt-6">
          <Text className="text-sm font-semibold mb-2">Name</Text>
          <TextInput
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
            className="border border-gray-300 p-3 rounded-lg mb-4"
          />

          <Text className="text-sm font-semibold mb-2">Gender</Text>
          <TextInput
            value={form.gender}
            onChangeText={(t) => setForm({ ...form, gender: t })}
            className="border border-gray-300 p-3 rounded-lg mb-4"
          />

          <Text className="text-sm font-semibold mb-2">Address</Text>
          <TextInput
            value={form.address}
            multiline
            onChangeText={(t) => setForm({ ...form, address: t })}
            className="border border-gray-300 p-3 rounded-lg mb-4"
          />

          <Text className="text-sm font-semibold mb-2">Telephone Number</Text>
          <TextInput
            value={form.tel_no}
            onChangeText={(t) => setForm({ ...form, tel_no: t })}
            className="border border-gray-300 p-3 rounded-lg mb-4"
            keyboardType="phone-pad"
          />

          <Text className="text-sm font-semibold mb-2">Occupation</Text>
          <TextInput
            value={form.occupation}
            onChangeText={(t) => setForm({ ...form, occupation: t })}
            className="border border-gray-300 p-3 rounded-lg mb-6"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          className="bg-blue-500 py-4 rounded-lg mb-20"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0">
      </View>
    </SafeAreaView>
  );
}
