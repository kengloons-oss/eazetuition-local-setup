import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";
import TutorBottomBar from "./tutorBottomBar";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Login: undefined; // add this
  HomeworkListPage: { tutor_id: number };
  HomeworkDetailsPage: { tutor_id: number; homework_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TutorClass = {
  class_id: number;
  class_name: string;
  subject_name: string;
};

export default function CreateHomeworkPage() {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { tutor_id } = route.params;

  const [userId, setUserId] = useState<number | null>(null);
  const [classes, setClasses] = useState<TutorClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load user_id from AsyncStorage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const u = JSON.parse(storedUser);
          if (u.type !== "tutor") {
            Alert.alert("Error", "Not authorized");
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            return;
          }
          setUserId(u.user_id);
        } else {
          Alert.alert("Error", "User not logged in");
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to load user info");
      }
    };
    loadUser();
  }, []);

  // Fetch tutor classes once userId is loaded
  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    fetch(`${API_BASE_URL}/homework/tutor/${userId}/classes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.classes) setClasses(data.classes);
        else setClasses([]);
      })
      .catch((err) => {
        console.error(err);
        Alert.alert("Error", "Failed to load classes");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleCreateHomework = () => {
    if (!selectedClassId || !homeworkTitle.trim() || !dueDate || !userId) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }

    setSubmitting(true);

    fetch(`${API_BASE_URL}/homework/tutor/homework/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        class_id: selectedClassId,
        homework_subject: homeworkTitle.trim(),
        description,
        due_date: dueDate.toISOString().split("T")[0], // YYYY-MM-DD
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          Alert.alert("Success", "Homework created successfully");
          navigation.goBack();
        } else {
          Alert.alert("Error", data.message || "Failed to create homework");
        }
      })
      .catch((err) => {
        console.error(err);
        Alert.alert("Error", "Network error");
      })
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-500 mt-2">Loading classes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-6 pt-4">
        <Text className="text-2xl font-bold mb-4">Create New Homework</Text>

        {/* Select Class */}
        <Text className="text-gray-700 mb-1">Select Class</Text>
        <View className="border border-gray-300 rounded-lg mb-4">
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.class_id}
              className={`px-4 py-3 ${
                selectedClassId === cls.class_id ? "bg-blue-100" : ""
              }`}
              onPress={() => setSelectedClassId(cls.class_id)}
            >
              <Text className="text-gray-800">
                {cls.subject_name} - {cls.class_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Homework Title */}
        <Text className="text-gray-700 mb-1">Homework Title</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
          placeholder="Enter homework title"
          value={homeworkTitle}
          onChangeText={setHomeworkTitle}
        />

        {/* Description */}
        <Text className="text-gray-700 mb-1">Description (optional)</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 h-24 text-gray-800"
          placeholder="Enter description"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Due Date */}
        <Text className="text-gray-700 mb-1">Due Date</Text>
        <TouchableOpacity
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{dueDate ? dueDate.toDateString() : "Select due date"}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display="default"
            onChange={(_, selected) => {
              setShowDatePicker(false);
              if (selected) setDueDate(selected);
            }}
          />
        )}

        {/* Submit Button */}
        <TouchableOpacity
          className={`px-4 py-3 rounded-xl mb-8 ${
            submitting || !userId
              ? "bg-gray-400"
              : "bg-purple-600"
          }`}
          onPress={handleCreateHomework}
          disabled={submitting || !userId}
        >
          <Text className="text-white text-center font-semibold">
            {submitting ? "Creating..." : "Create Homework"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0">
        <TutorBottomBar />
      </View>
    </SafeAreaView>
  );
}
