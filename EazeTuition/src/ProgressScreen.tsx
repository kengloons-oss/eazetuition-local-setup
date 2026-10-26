import React, { useEffect, useState, useRef } from "react";
import { 
  View, Text, ScrollView, Dimensions, TouchableOpacity, Alert, Modal, Button, RefreshControl, Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Header from "./Header";
import BottomBar from "./BottomBar";
import { LineChart } from "react-native-chart-kit";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_BASE_URL } from './config';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  EvaluateNextTestScreen: { student_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ProgressItem {
  completed_at: string;
  score: number;
  level_name: string;
}

export default function ProgressScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = useState<{ name: string; user_id: number; type: string; edu_lvl_id: number } | null>(null);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false); 
  const chartRef = useRef<View>(null);

  const fetchProgress = async (user_id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/evaluation/progress?user_id=${user_id}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setProgress(data.results || []);
    } catch (err) {
      console.error("Network error:", err);
      Alert.alert("Error", "Failed to load progress data");
    } finally {
      setRefreshing(false); 
    }
  };

  const loadUserAndProgress = async () => {
    const storedUser = await AsyncStorage.getItem("user");
    if (!storedUser) {
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      return;
    }

    const u = JSON.parse(storedUser);
    if (u.type !== "student") {
      Alert.alert("Access denied", "Only students can access this page.");
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      return;
    }

    setUser(u);
    fetchProgress(u.user_id);
  };

  useEffect(() => {
    loadUserAndProgress();
  }, []);

  const onRefresh = () => {
    if (user) {
      setRefreshing(true);
      fetchProgress(user.user_id);
    }
  };

  const filteredProgress = monthFilter
    ? progress.filter(p => new Date(p.completed_at).getMonth() + 1 === parseInt(monthFilter))
    : progress;

  const latestProgress = filteredProgress.slice(-7);

  const handleTakeTest = () => {
    if (!user) return;
    navigation.navigate("EvaluateNextTestScreen", { student_id: user.user_id });
  };

  const handleCaptureAndShare = async () => {
    if (!chartRef.current) return;
    try {
      const uri = await captureRef(chartRef, { format: "png", quality: 1 });
      const fileUri = `${FileSystem.cacheDirectory}progress_chart.png`;
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      await Sharing.shareAsync(fileUri);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to capture/share chart");
    }
  };



  const screenWidth = Dimensions.get("window").width - 32;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-4 pt-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Header showBackButton={false} />

        <View className="mb-4">
          <Text className="text-base font-semibold mb-2">Filter by Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
            ].map((monthName, index) => (
              <TouchableOpacity
                key={monthName}
                onPress={() => setMonthFilter(monthFilter === `${index+1}` ? null : `${index+1}`)}
                className={`px-4 py-2 mr-2 rounded-lg border ${
                  monthFilter === `${index+1}` 
                    ? "bg-blue-500 border-blue-500" 
                    : "border-gray-300"
                }`}
              >
                <Text className={monthFilter === `${index+1}` ? "text-white font-semibold" : "text-gray-800"}>
                  {monthName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text className="text-lg font-semibold mb-2">Your Progress</Text>
        {latestProgress.length > 0 ? (
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <View ref={chartRef}>
              <LineChart
                data={{
                  labels: latestProgress.map(p => {
                    const d = new Date(p.completed_at);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }),
                  datasets: [{ data: latestProgress.map(p => p.score) }],
                }}
                width={screenWidth}
                height={220}
                yAxisSuffix="%"
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                  style: { borderRadius: 12 },
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#3b82f6" },
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 12 }}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <Text className="text-gray-400 mb-4">No progress data yet</Text>
        )}

        <View className="mt-6 mb-10">
          <Text className="text-lg font-semibold mb-2">Continue Your Test</Text>
          <TouchableOpacity
            className="bg-blue-500 py-3 px-4 rounded-lg"
            onPress={handleTakeTest}
          >
            <Text className="text-white text-center text-base">
              {progress.length === 0 ? "Take Initial Test" : "Take Next Test"}
            </Text>
          </TouchableOpacity> 
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView className="flex-1 bg-white px-4">
          <Text className="text-xl font-bold text-center mt-4 mb-4">Progress Chart</Text>
          <LineChart
            data={{
              labels: latestProgress.map(p => {
                const d = new Date(p.completed_at);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }),
              datasets: [{ data: latestProgress.map(p => p.score) }],
            }}
            width={Dimensions.get("window").width - 32}
            height={400}
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
              style: { borderRadius: 12 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: "#3b82f6" },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 12 }}
          />
          <View className="mt-4 flex-row justify-around">
            <Button title="Share Chart" onPress={handleCaptureAndShare} />
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </SafeAreaView>
      </Modal>

      <View className="absolute bottom-0 left-0 right-0">
        <BottomBar />
      </View>
    </SafeAreaView>
  );
}
