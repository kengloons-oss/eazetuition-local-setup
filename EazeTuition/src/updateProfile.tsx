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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from './config';
import BottomBar from "./BottomBar";
import Header from "./Header";

export default function UpdateProfile({ route, navigation }: any) {
  const { profile } = route.params;

  const [form, setForm] = useState({
    user_id: profile.user_id,
    name: profile.name || "",
    gender: profile.gender || "",
    address: profile.address || "",
    profile_pic: profile.profile_pic || "",
    tel_no: profile.tel_no || "",
    occupation: profile.occupation || "",
    age: profile.age?.toString() || "",
  });

  const [imageUri, setImageUri] = useState(profile.profile_pic || "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageSource, setImageSource] = useState<'url' | 'base64'>('base64');

  // Detect image type when component loads
  useEffect(() => {
    if (profile.profile_pic) {
      if (profile.profile_pic.startsWith('data:image/')) {
        setImageSource('base64');
        setImageUri(profile.profile_pic);
      } else if (profile.profile_pic.startsWith('http')) {
        setImageSource('url');
        setImageUri(profile.profile_pic);
      } else {
        setImageSource('base64');
        setImageUri("");
      }
    }
  }, [profile.profile_pic]);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
    if (key === 'profile_pic') {
      setImageUri(value);
      if (value.startsWith('data:image/')) {
        setImageSource('base64');
      } else if (value.startsWith('http')) {
        setImageSource('url');
      }
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Sorry, we need camera roll permissions to make this work!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        
        // Convert to base64 for upload
        if (asset.base64) {
          const base64Data = `data:image/jpeg;base64,${asset.base64}`;
          setForm({ ...form, profile_pic: base64Data });
        }
        setImageSource('base64');
        setImageModalVisible(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Sorry, we need camera permissions to make this work!");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        
        if (asset.base64) {
          const base64Data = `data:image/jpeg;base64,${asset.base64}`;
          setForm({ ...form, profile_pic: base64Data });
        }
        setImageSource('base64');
        setImageModalVisible(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  // Use URL for profile picture
  const useURL = () => {
    setImageSource('url');
    setImageModalVisible(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload: any = {
        user_id: form.user_id,
        name: form.name,
        gender: form.gender,
        address: form.address,
      };

      // Only include profile_pic if it's changed
      if (form.profile_pic && form.profile_pic !== profile.profile_pic) {
        payload.profile_pic = form.profile_pic;
      }

      if (profile.type === "parent") {
        payload.tel_no = form.tel_no;
        payload.occupation = form.occupation;
      } else if (profile.type === "student") {
        payload.age = parseInt(form.age) || null;
      } else if (profile.type === "tutor") {
        payload.tel_no = form.tel_no;
      }

      const res = await fetch(`${API_BASE_URL}/auth/updateProfile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert("Success", "Profile updated successfully", [
          {
            text: "OK",
            onPress: () => navigation.navigate("Profile", { user_id: form.user_id }),
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

  // Function to get image source for display
  const getImageSource = () => {
    if (!imageUri) {
      return require('../assets/images/avatar.jpg');
    }
    return { uri: imageUri };
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <Header showBackButton={true} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold mt-4 mb-6">Update Profile</Text>

        {/* Profile Picture Section */}
        <View className="items-center mb-6">
          <Text className="text-lg font-semibold mb-3">Profile Picture</Text>
          
          {/* Current Profile Picture */}
          <View className="relative mb-4">
            <Image
              source={getImageSource()}
              className="w-32 h-32 rounded-full border-2 border-gray-300"
              resizeMode="cover"
            />
            {/* Show image type badge */}
            {imageUri && (
              <View className="absolute -top-2 -right-2 bg-blue-500 px-2 py-1 rounded-full">
                <Text className="text-white text-xs">
                  {imageSource === 'base64' ? '📱' : '🔗'}
                </Text>
              </View>
            )}
          </View>

          {/* Change Picture Button */}
          <TouchableOpacity
            onPress={() => setImageModalVisible(true)}
            className="bg-blue-500 px-6 py-3 rounded-lg mb-4"
          >
            <Text className="text-white font-bold">Change Picture</Text>
          </TouchableOpacity>

          {/* Image Source Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={imageModalVisible}
            onRequestClose={() => setImageModalVisible(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/50">
              <View className="bg-white rounded-2xl p-6 w-80">
                <Text className="text-xl font-bold mb-4 text-center">
                  Choose Photo Source
                </Text>
                
                <TouchableOpacity
                  onPress={pickImage}
                  className="bg-blue-500 py-4 rounded-lg mb-3"
                >
                  <Text className="text-white text-center font-bold text-lg">
                    📁 Choose from Gallery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={takePhoto}
                  className="bg-green-500 py-4 rounded-lg mb-3"
                >
                  <Text className="text-white text-center font-bold text-lg">
                    📷 Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={useURL}
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
                  <Text className="text-white text-center font-bold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* URL Input (shown when using URL or when image is URL) */}
          {imageSource === 'url' && (
            <View className="w-full mt-4">
              <Text className="text-sm font-medium mb-2">Profile Picture URL</Text>
              <TextInput
                value={form.profile_pic}
                onChangeText={(text) => handleChange("profile_pic", text)}
                placeholder="https://example.com/image.jpg"
                className="border border-gray-300 p-3 rounded-lg"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text className="text-xs text-gray-500 mt-1">
                Enter a direct image URL
              </Text>
            </View>
          )}

          {/* Image Info */}
          {imageUri && (
            <View className="w-full mt-4 p-3 bg-blue-50 rounded-lg">
              <Text className="text-blue-800 text-sm text-center">
                {imageSource === 'base64' ? '📱 Image stored in database' : '🔗 External image URL'}
              </Text>
              {imageSource === 'base64' && (
                <Text className="text-blue-600 text-xs text-center mt-1">
                  {Math.round(form.profile_pic?.length / 1024) || 0}KB
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Basic Information */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-4">Basic Information</Text>
          
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2">Name</Text>
            <TextInput
              value={form.name}
              onChangeText={(text) => handleChange("name", text)}
              className="border border-gray-300 p-3 rounded-lg"
              placeholder="Enter your name"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium mb-2">Gender</Text>
            <TextInput
              value={form.gender}
              onChangeText={(text) => handleChange("gender", text)}
              placeholder="male / female"
              className="border border-gray-300 p-3 rounded-lg"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium mb-2">Address</Text>
            <TextInput
              value={form.address}
              onChangeText={(text) => handleChange("address", text)}
              className="border border-gray-300 p-3 rounded-lg"
              placeholder="Enter your address"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Role Specific Information */}
        {profile.type === "parent" && (
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-4">Parent Information</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium mb-2">Telephone Number</Text>
              <TextInput
                value={form.tel_no}
                onChangeText={(text) => handleChange("tel_no", text)}
                className="border border-gray-300 p-3 rounded-lg"
                placeholder="Enter telephone number"
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium mb-2">Occupation</Text>
              <TextInput
                value={form.occupation}
                onChangeText={(text) => handleChange("occupation", text)}
                className="border border-gray-300 p-3 rounded-lg"
                placeholder="Enter occupation"
              />
            </View>
          </View>
        )}

        {profile.type === "student" && (
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-4">Student Information</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium mb-2">Age</Text>
              <TextInput
                value={form.age}
                onChangeText={(text) => handleChange("age", text)}
                keyboardType="numeric"
                className="border border-gray-300 p-3 rounded-lg"
                placeholder="Enter age"
              />
            </View>
          </View>
        )}

        {profile.type === "tutor" && (
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-4">Tutor Information</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium mb-2">Telephone Number</Text>
              <TextInput
                value={form.tel_no}
                onChangeText={(text) => handleChange("tel_no", text)}
                className="border border-gray-300 p-3 rounded-lg"
                placeholder="Enter telephone number"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          className="bg-blue-500 py-4 rounded-lg mt-4 mb-6 items-center"
          disabled={loading || uploading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Save Changes</Text>
          )}
        </TouchableOpacity>
        <View className="h-100" />
      </ScrollView>
      
      <View className="absolute bottom-0 left-0 right-0">
        <BottomBar/>
      </View>
    </SafeAreaView>
  );
}