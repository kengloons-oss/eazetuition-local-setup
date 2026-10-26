import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_BASE_URL } from "./config";
import Header from "./Header";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";

type RootStackParamList = {
  HomeworkDetailsScreen: { student_id: number; homework_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type HomeworkDetails = {
  homework_id: number;
  homework_subject: string;
  description?: string | null;
  due_date: string;
  status: string;
  grade?: string | null;
  ai_grade?: string | null;
  feedback_from_tutor?: string | null;
  feedback_from_ai?: string | null;
  submission_id?: number | null;
};

export default function HomeworkDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { student_id, homework_id } = route.params;

  const [details, setDetails] = useState<HomeworkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/homework/student/homework/${student_id}/detail/${homework_id}`
      );
      const data = await res.json();

      if (data.success && data.homework) {
        setDetails(data.homework);
      } else {
        Alert.alert("Error", "Failed to load homework details");
      }
    } catch (err) {
      console.error("❌ Network error:", err);
      Alert.alert("Error", "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [student_id, homework_id]);

  const handleUpload = async () => {
    try {
      const fileResult = await DocumentPicker.getDocumentAsync({});
      if (fileResult.canceled) return;

      const file = fileResult.assets?.[0];
      if (!file) return;

      setUploading(true);

      const formData = new FormData();
      formData.append("user_id", String(student_id));
      formData.append("homework_id", String(homework_id));
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: "*/*",
      } as any);

      const res = await fetch(`${API_BASE_URL}/homework/student/homework/upload`, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = await res.json();

      if (data.success) {
        Alert.alert("✅ Success", "Homework uploaded successfully!");
        fetchDetails();
      } else {
        Alert.alert("Error", data.message || "Failed to upload");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Upload failed, try again");
    } finally {
      setUploading(false);
    }
  };

  const handleViewSubmission = async () => {
    if (!details?.submission_id)
      return Alert.alert("Error", "No submission found");

    setDownloading(true);

    try {
      const url = `${API_BASE_URL}/homework/student/homework/${details.submission_id}/download`;
      const localUri = `${FileSystem.documentDirectory}submission_${details.submission_id}.pdf`;

      const res = await FileSystem.downloadAsync(url, localUri);

      if (res.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(res.uri);
        } else {
          Alert.alert("Downloaded", "File saved to device storage");
        }
      } else {
        Alert.alert("Error", "Failed to download file");
      }
    } catch (err) {
      console.error("❌ Download error:", err);
      Alert.alert("Error", "Unable to open submission");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-500 mt-2">Loading homework details...</Text>
      </View>
    );
  }

  if (!details) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500">Homework not found</Text>
      </View>
    );
  }

  const isSubmitted = details.status.toLowerCase() !== "not submitted";

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Header showBackButton={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-6 mt-4 mb-28"
      >
        {/* Subject & Status */}
        <View className="bg-white p-5 rounded-xl shadow-md mb-4">
          <Text className="text-2xl font-bold text-blue-600 mb-2">
            {details.homework_subject}
          </Text>

          <View className="flex-row items-center mb-2">
            <MaterialIcons name="event" size={20} color="#2563eb" style={{ marginRight: 6 }} />
            <Text className="text-gray-600">Due: {details.due_date}</Text>
          </View>

          <View className="mt-2">
            <Text
              className={`font-semibold px-3 py-1 rounded-full text-white w-fit ${
                isSubmitted ? "bg-green-500" : "bg-blue-500"
              }`}
            >
              {details.status}
            </Text>
          </View>

          {details.description ? (
            <Text className="text-gray-700 mt-3">{details.description}</Text>
          ) : null}
        </View>

        {/* Grades & Tutor Feedback */}
        {(details.grade ||
          details.feedback_from_tutor ||
          details.ai_grade ||
          details.feedback_from_ai) && (
          <View className="bg-white p-5 rounded-xl shadow-md mb-4">
            <Text className="text-lg font-semibold mb-2">Grades & Feedback</Text>

            {details.grade && (
              <Text className="text-gray-700 mb-1">
                <Text className="font-semibold">Tutor Grade: </Text>
                {details.grade}
              </Text>
            )}

            {details.feedback_from_tutor && (
              <Text className="text-gray-700 mb-1">
                <Text className="font-semibold">Tutor Feedback: </Text>
                {details.feedback_from_tutor}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Button */}
      <TouchableOpacity
        className={`absolute bottom-6 left-6 right-6 py-4 rounded-2xl shadow-lg ${
          isSubmitted ? "bg-green-500" : "bg-blue-500"
        }`}
        onPress={isSubmitted ? handleViewSubmission : handleUpload}
        disabled={uploading || downloading}
      >
        <Text className="text-center text-white text-lg font-semibold">
          {uploading
            ? "Uploading..."
            : downloading
            ? "Opening..."
            : isSubmitted
            ? "View Submission"
            : "Upload Homework"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
