import { API_BASE_URL } from './config';
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";

type RootStackParamList = {
  Home: undefined;
  EvaluateNextTest: { user_id: number }; // system user_id from frontend
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Question = {
  question_id: number;
  question_text: string;
  options: Record<string, string>;
};

export default function EvaluateNextTestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { student_id: user_id } = route.params; // rename locally for clarity


  const [testId, setTestId] = useState<number | null>(null);
  const [eduLvlId, setEduLvlId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);

  // 1️⃣ Fetch next test on mount
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/evaluation/next_test?student_id=${user_id}`)
      .then((res) => {
        const data = res.data;
        if (data.done || !data.next_test_id) {
          Alert.alert("All Tests Completed", data.message, [
            { text: "OK", onPress: () => navigation.reset({ index: 0, routes: [{ name: "Home" }] }) },
          ]);
        } else {
          setTestId(data.next_test_id);
          setEduLvlId(data.student_id); // optional, you can fetch actual level if needed
        }
      })
      .catch((err) => {
        console.error(err);
        Alert.alert("Error", "Failed to fetch next test");
      });
  }, [user_id]);

  // 2️⃣ Fetch questions when testId is available
  useEffect(() => {
    if (!testId) return;

    setLoading(true);
    axios
      .get(`${API_BASE_URL}/evaluation/testNextQuestion?student_id=${user_id}&test_id=${testId}`)
      .then((res) => {
        if (Array.isArray(res.data.questions)) {
          setQuestions(res.data.questions);
        } else {
          setQuestions([]);
          Alert.alert("Error", "No questions found for this test.");
        }
      })
      .catch((err) => {
        console.error(err);
        Alert.alert("Error", "Failed to load questions");
      })
      .finally(() => setLoading(false));
  }, [testId, user_id]);

  const selectAnswer = (question_id: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [question_id]: option }));
  };

  const submitTest = () => {
    if (Object.keys(answers).length !== questions.length) {
      Alert.alert("Incomplete", "Please answer all questions before submitting.");
      return;
    }

    const payload = {
      user_id,
      test_id: testId,
      answers: Object.entries(answers).map(([question_id, selected_answer]) => ({
        question_id: parseInt(question_id, 10),
        selected_answer,
      })),
    };

    axios
      .post(`${API_BASE_URL}/evaluation/submit_next_test`, payload)
      .then((res) => {
        const data = res.data;

        if (data.blocked) {
          Alert.alert(
            "Score Too Low",
            `Your score is ${data.score_percent.toFixed(0)}%. You cannot proceed to the next test. Please review the material.`,
            [{ text: "OK" }]
          );
          return;
        }

        // Ask for confirmation before proceeding to next test
        Alert.alert(
          "Test Submitted",
          `Score: ${data.score_percent.toFixed(0)}%\nNew Level: ${data.new_level_name}`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                // Stay on current screen
                console.log("User chose to stay on this test screen.");
              },
            },
            {
              text: data.done ? "OK" : "Next Test",
              onPress: () => {
                if (!data.done) {
                  // Reset state and fetch next test
                  setTestId(null);
                  setQuestions([]);
                  setAnswers({});
                  setLoading(true);

                  axios
                    .get(`${API_BASE_URL}/evaluation/next_test?student_id=${user_id}`)
                    .then((res) => {
                      const nextData = res.data;
                      if (nextData.done || !nextData.next_test_id) {
                        Alert.alert("All Tests Completed", nextData.message, [
                          {
                            text: "OK",
                            onPress: () =>
                              navigation.reset({ index: 0, routes: [{ name: "Home" }] }),
                          },
                        ]);
                      } else {
                        setTestId(nextData.next_test_id);
                        setEduLvlId(nextData.student_id);
                      }
                    })
                    .finally(() => setLoading(false));
                } else {
                  navigation.reset({ index: 0, routes: [{ name: "Home" }] });
                }
              },
            },
          ]
        );
      })
      .catch((err) => {
        console.error(err);
        Alert.alert("Error", "Failed to submit test");
      });
  };



  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-4">
      <ScrollView className="pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-center mb-6">
          {testId === 1 ? "Initial Assessment" : `Test ${testId}`}
        </Text>

        {questions.map((q, index) => (
          <View key={q.question_id} className="mb-6 p-4 border border-gray-200 rounded-lg">
            <Text className="font-semibold mb-3">
              {index + 1}. {q.question_text}
            </Text>

            {Object.entries(q.options).map(([key, text]) => (
              <TouchableOpacity
                key={key}
                onPress={() => selectAnswer(q.question_id, key)}
                className={`py-3 px-4 mb-2 rounded-lg border ${
                  answers[q.question_id] === key
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-300"
                }`}
              >
                <Text className={`${answers[q.question_id] === key ? "text-white" : "text-gray-800"}`}>
                  {key}. {text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity onPress={submitTest} className="bg-blue-500 py-4 rounded-lg mb-10">
          <Text className="text-white text-center font-semibold text-lg">
            Submit Test
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
