import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../config";
import TutorBottomBar  from "../tutor/tutorBottomBar";


export default function TutorUpdateProfile({ route, navigation }: any) {
  const { profile } = route.params;

  const [form, setForm] = useState({
    user_id: profile.user_id,
    name: profile.name,
    gender: profile.gender,
    address: profile.address,
    tel_no: profile.tel_no,
    profile_pic: profile.profile_pic || "",
  });

  const [imageUri, setImageUri] = useState(form.profile_pic);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageSource, setImageSource] = useState<'url' | 'base64'>('base64');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.profile_pic) {
      if (form.profile_pic.startsWith("http")) {
        setImageSource("url");
        setImageUri(form.profile_pic);
      } else if (form.profile_pic.startsWith("data:image/")) {
        setImageSource("base64");
        setImageUri(form.profile_pic);
      }
    }
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });

    if (key === "profile_pic") {
      setImageUri(value);
      if (value.startsWith("http")) setImageSource("url");
      if (value.startsWith("data:image/")) setImageSource("base64");
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const base64 = `data:image/jpeg;base64,${asset.base64}`;
      setImageUri(asset.uri);
      setForm({ ...form, profile_pic: base64 });
      setImageSource("base64");
      setImageModalVisible(false);
    }
  };

  // Take photo
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const base64 = `data:image/jpeg;base64,${asset.base64}`;
      setImageUri(asset.uri);
      setForm({ ...form, profile_pic: base64 });
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
        profile_pic: form.profile_pic,
      };

      const res = await fetch(`${API_BASE_URL}/auth/updateProfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert("Success", "Profile updated successfully", [
          {
            text: "OK",
            onPress: () => navigation.navigate("TutorProfile", {
              user_id: form.user_id,
            }),
          },
        ]);
      } else {
        Alert.alert("Error", data.error || "Failed to update profile");
      }
    } catch (err) {
      Alert.alert("Error", "Server error");
    } finally {
      setLoading(false);
    }
  };

  const getImageSource = () => {
    if (!imageUri) return require("../../assets/images/avatar.jpg");
    return { uri: imageUri };
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold mt-4 mb-6">Tutor Profile</Text>

        {/* Profile Picture */}
        <View className="items-center mb-6">
          <Text className="text-lg font-semibold mb-3">Profile Picture</Text>

          <View className="relative mb-4">
            <Image
              source={getImageSource()}
              className="w-32 h-32 rounded-full border-2 border-gray-300"
            />

            {imageUri && (
              <View className="absolute -top-2 -right-2 bg-blue-500 px-2 py-1 rounded-full">
                <Text className="text-white text-xs">
                  {imageSource === "base64" ? "📱" : "🔗"}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setImageModalVisible(true)}
            className="bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-bold">Change Picture</Text>
          </TouchableOpacity>
        </View>

        {/* Image Modal */}
        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-xl p-6 w-80">
              <Text className="text-xl font-bold mb-4 text-center">Choose Photo</Text>

              <TouchableOpacity
                onPress={pickImage}
                className="bg-blue-500 py-4 rounded-lg mb-3"
              >
                <Text className="text-white text-center font-bold text-lg">
                  📁 Gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={takePhoto}
                className="bg-green-500 py-4 rounded-lg mb-3"
              >
                <Text className="text-white text-center font-bold text-lg">
                  📷 Camera
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setImageSource("url");
                  setImageModalVisible(false);
                }}
                className="bg-purple-500 py-4 rounded-lg mb-3"
              >
                <Text className="text-white text-center font-bold text-lg">
                  🔗 Use URL
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

        {/* URL input if using URL */}
        {imageSource === "url" && (
          <View className="mb-6">
            <Text className="text-sm font-medium mb-2">Profile Picture URL</Text>
            <TextInput
              value={form.profile_pic}
              onChangeText={(text) => handleChange("profile_pic", text)}
              className="border p-3 rounded-lg"
              placeholder="https://example.com/photo.jpg"
            />
          </View>
        )}

        {/* Basic Info */}
        <Text className="text-lg font-semibold mb-4">Basic Information</Text>

        <View className="mb-4">
          <Text className="text-sm font-medium mb-2">Name</Text>
          <TextInput
            value={form.name}
            onChangeText={(text) => handleChange("name", text)}
            className="border p-3 rounded-lg"
            placeholder="Enter your name"
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium mb-2">Gender</Text>
          <TextInput
            value={form.gender}
            onChangeText={(text) => handleChange("gender", text)}
            className="border p-3 rounded-lg"
            placeholder="male / female"
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium mb-2">Address</Text>
          <TextInput
            value={form.address}
            onChangeText={(text) => handleChange("address", text)}
            className="border p-3 rounded-lg"
            multiline
            numberOfLines={3}
            placeholder="Enter address"
          />
        </View>

        {/* Tutor Phone */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2">Telephone Number</Text>
          <TextInput
            value={form.tel_no}
            onChangeText={(text) => handleChange("tel_no", text)}
            className="border p-3 rounded-lg"
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="bg-blue-500 py-4 rounded-lg mt-4 mb-10"
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
        <TutorBottomBar  />
      </View>
    </SafeAreaView>
  );
}
