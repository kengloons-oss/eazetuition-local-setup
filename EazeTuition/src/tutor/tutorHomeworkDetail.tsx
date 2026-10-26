import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from "../config";
import TutorBottomBar from "./tutorBottomBar";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  HomeworkListPage: { tutor_id: number };
  HomeworkDetailsPage: { tutor_id: number; homework_id: number };
  SubmissionPreviewPage: { submission_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type StudentSubmission = {
  student_id: number;
  student_name: string;
  submitted: boolean;
  submission_id?: number;
  grade?: string;
  feedback_from_tutor?: string;
  ai_grade?: string;
  feedback_from_ai?: string;
};

type HomeworkDetail = {
  homework_id: number;
  homework_subject: string;
  description: string;
  due_date: string;
  students: StudentSubmission[];
};

export default function HomeworkDetailsPage() {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { homework_id, tutor_id } = route.params;

  const [homework, setHomework] = useState<HomeworkDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states for grading
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");

  // Fetch homework details
  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      fetch(`${API_BASE_URL}/homework/tutor/homework/${homework_id}/detail`)
        .then((res) => {
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data.success && data.homework) {
            setHomework(data.homework);
          } else {
            setHomework(null);
            Alert.alert("Error", "Homework not found");
          }
        })
        .catch((err) => {
          console.error("❌ Network error:", err);
          Alert.alert("Error", "Failed to load homework details");
        })
        .finally(() => setLoading(false));
    }, [homework_id])
  );

  // Handle manual grading
  const handleGradeSubmit = async () => {
    if (!selectedSubmission) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/homework/tutor/homework/${selectedSubmission.submission_id}/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grade: gradeInput,
            feedback: feedbackInput,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        Alert.alert("Success", "Submission graded successfully");
        setModalVisible(false);
        setGradeInput("");
        setFeedbackInput("");
        setSelectedSubmission(null);
        refreshHomework();
      } else {
        Alert.alert("Error", data.message || "Failed to grade submission");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to grade submission");
    }
  };

  const refreshHomework = () => {
    fetch(`${API_BASE_URL}/homework/tutor/homework/${homework_id}/detail`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.homework) setHomework(data.homework);
      });
  };

  // 🧠 Handle AI Evaluation
  const handleAIEvaluate = async (submission_id: number, student_name: string) => {
    Alert.alert(
      "Confirm AI Evaluation",
      `Do you want to use AI to evaluate ${student_name}'s submission?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Evaluate",
          onPress: async () => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/homework/tutor/homework/${submission_id}/ai-evaluate`,
                { method: "POST" }
              );
              const data = await res.json();
              if (data.success) {
                Alert.alert("✅ Success", "AI evaluation completed!");
                refreshHomework();
              } else {
                Alert.alert("Error", data.message || "AI evaluation failed");
              }
            } catch (err) {
              console.error("AI Evaluation Error:", err);
              Alert.alert("Error", "Unable to connect to server");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-500 mt-2">Loading homework details...</Text>
      </View>
    );
  }

  if (!homework) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500">Homework details not available.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
        {/* Homework Info */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-blue-600 mb-2">
            {homework.homework_subject}
          </Text>
          <Text className="text-gray-700 mb-2">Due: {homework.due_date}</Text>
          <Text className="text-gray-600">{homework.description}</Text>
        </View>

        {/* Student Submissions */}
        <Text className="text-xl font-semibold mb-3">Student Submissions</Text>
        {homework.students.length === 0 ? (
          <Text className="text-gray-500">No students enrolled.</Text>
        ) : (
          homework.students.map((student, index) => (
            <View
              key={`${homework.homework_id}-${student.student_id}-${index}`}
              className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-100 shadow-sm"
            >
              <Text className="text-lg font-medium text-gray-800">{student.student_name}</Text>
              <Text className="text-gray-700">
                Status:{" "}
                <Text
                  className={`font-semibold ${
                    student.submitted ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {student.submitted ? "Submitted" : "Pending"}
                </Text>
              </Text>

              {student.submitted && (
                <>
                  {/* Tutor Feedback */}
                  <Text className="text-gray-700 mt-1 font-semibold">Tutor Evaluation</Text>
                  <Text className="text-gray-700">Grade: {student.grade ?? "Not graded"}</Text>
                  <Text className="text-gray-700">Feedback: {student.feedback_from_tutor ?? "-"}</Text>

                  {/* AI Feedback */}
                  {student.ai_grade || student.feedback_from_ai ? (
                    <>
                      <Text className="text-purple-700 font-semibold mt-2">AI Evaluation</Text>
                      <Text className="text-purple-600">AI Grade: {student.ai_grade ?? "-"}</Text>
                      <Text className="text-purple-600">
                        AI Feedback: {student.feedback_from_ai ?? "-"}
                      </Text>
                    </>
                  ) : null}

                  {/* Download Submission */}
                  <TouchableOpacity
                    className="mt-2 bg-blue-600 px-3 py-1 rounded-lg w-32"
                    onPress={() => {
                      if (student.submission_id) {
                        const downloadUrl = `${API_BASE_URL}/homework/tutor/homework/${student.submission_id}/download`;
                        Linking.openURL(downloadUrl);
                      } else {
                        Alert.alert("Error", "Submission file not available.");
                      }
                    }}
                  >
                    <Text className="text-white text-center font-semibold">
                      Download Submission
                    </Text>
                  </TouchableOpacity>

                  {/* Grade & Feedback */}
                  <TouchableOpacity
                    className="mt-2 bg-green-600 px-3 py-1 rounded-lg w-32"
                    onPress={() => {
                      setSelectedSubmission(student);
                      setGradeInput(student.grade?.toString() || "");
                      setFeedbackInput(student.feedback_from_tutor || "");
                      setModalVisible(true);
                    }}
                  >
                    <Text className="text-white text-center font-semibold">
                      Grade & Feedback
                    </Text>
                  </TouchableOpacity>

                  {/* 🧠 AI Evaluate Button */}
                  <TouchableOpacity
                    className="mt-2 bg-purple-600 px-3 py-1 rounded-lg w-32"
                    onPress={() => {
                      if (student.submission_id) {
                        handleAIEvaluate(student.submission_id, student.student_name);
                      } else {
                        Alert.alert("Error", "Submission not found for AI evaluation.");
                      }
                    }}
                  >
                    <Text className="text-white text-center font-semibold">
                      AI Evaluate
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Grade Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-xl p-6 w-11/12">
            <Text className="text-xl font-bold mb-4">Grade & Feedback</Text>

            <Text className="font-semibold">Grade</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 mb-4"
              keyboardType="numeric"
              value={gradeInput}
              onChangeText={setGradeInput}
            />

            <Text className="font-semibold">Feedback</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 mb-4"
              value={feedbackInput}
              onChangeText={setFeedbackInput}
              multiline
            />

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="bg-gray-300 px-4 py-2 rounded-lg"
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-green-600 px-4 py-2 rounded-lg"
                onPress={handleGradeSubmit}
              >
                <Text className="text-white">Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="absolute bottom-0 left-0 right-0">
        <TutorBottomBar />
      </View>
    </SafeAreaView>
  );
}
