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
  EvaluationTest: { student_id: number; test_id?: number; edu_lvl_id?: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Question = {
  question_id: number;
  question_text: string;
  options: Record<string, string>;
};

export default function EvaluationTestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { student_id, test_id: routeTestId, edu_lvl_id } = route.params;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);

  const testId = routeTestId || 1; // default first test

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/evaluation/testQuestion?test_id=${testId}`)
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
        setQuestions([]);
        Alert.alert("Error", "Failed to load questions");
      })
      .finally(() => setLoading(false));
  }, [testId]);

  const selectAnswer = (question_id: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [question_id]: option }));
  };

  const submitTest = () => {
    if (Object.keys(answers).length !== questions.length) {
      Alert.alert("Incomplete", "Please answer all questions before submitting.");
      return;
    }

    const payload = {
      student_id,
      test_id: testId,
      answers: Object.entries(answers).map(([question_id, selected_answer]) => ({
        question_id: parseInt(question_id, 10),
        selected_answer,
      })),
    };

    axios
      .post(`${API_BASE_URL}/evaluation/submit`, payload)
      .then((res) => {
        Alert.alert(
          "Test Submitted",
          `Score: ${res.data.score}/${res.data.total_questions}\nLevel: ${res.data.level_name}`,
          [
            {
              text: "OK",
              onPress: () => navigation.reset({ index: 0, routes: [{ name: "Home" }] }),
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
          {testId === 1 ? "Initial Assessment" : `Level ${edu_lvl_id} Test`}
        </Text>

        {questions.map((q, index) => (
          <View
            key={q.question_id}
            className="mb-6 p-4 border border-gray-200 rounded-lg"
          >
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
                <Text
                  className={`${
                    answers[q.question_id] === key ? "text-white" : "text-gray-800"
                  }`}
                >
                  {key}. {text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity
          onPress={submitTest}
          className="bg-blue-500 py-4 rounded-lg mb-10"
        >
          <Text className="text-white text-center font-semibold text-lg">
            Submit Test
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
