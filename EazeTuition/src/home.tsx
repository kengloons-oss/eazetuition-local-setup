import { API_BASE_URL } from './config';
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar } from 'react-native-calendars';
import BottomBar from "./BottomBar";

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Profile: { user_id: number };
  Settings: undefined;
  Notifications: undefined;
  UpcomingClassScreen: { student_id: number };
  HomeworkScreen: { student_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ClassStatus = 'upcoming' | 'attended' | 'absent' | 'ongoing';

interface ClassItem {
  class_id: number;
  schedule_id: number;
  subject: string;
  tutor: string;
  start_datetime: string;
  end_datetime: string;
  room: string;
  status: ClassStatus;
}

const { width: screenWidth } = Dimensions.get('window');

export default function Home() {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = useState<{ name: string; user_id: number; type: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [upcoming, setUpcoming] = useState<ClassItem[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);   // << Added

  // --------------------
  // LOAD USER
  // --------------------
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);

        if (u.type === "student") {
          setUser(u);
          fetchUpcoming(u.user_id);
          fetchCalendarClasses(u.user_id);
        } else {
          alert("Access denied: Only students can access this page.");
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
      } else {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    processMarkedDates();
  }, [allClasses]);

  // --------------------
  // MARK DATES
  // --------------------
  const processMarkedDates = () => {
    const marks: any = {};

    allClasses.forEach(item => {
      const dateObj = new Date(item.start_datetime);
      const date = dateObj.toISOString().split('T')[0];

      let dotColor = '#3b82f6';
      let backgroundColor = '#3b82f6';

      switch (item.status) {
        case 'attended':
          dotColor = '#10b981'; backgroundColor = '#10b981';
          break;
        case 'absent':
          dotColor = '#ef4444'; backgroundColor = '#ef4444';
          break;
        case 'ongoing':
          dotColor = '#f59e0b'; backgroundColor = '#f59e0b';
          break;
      }

      if (marks[date]) {
        marks[date].classes.push(item);
      } else {
        marks[date] = {
          selected: true,
          selectedColor: backgroundColor,
          marked: true,
          dotColor,
          dots: [{ key: item.schedule_id, color: dotColor }],
          classes: [item]
        };
      }
    });

    setMarkedDates(marks);
  };

  // --------------------
  // API CALLS
  // --------------------
  const fetchUpcoming = async (student_id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/home/upcomingClass?student_id=${student_id}`);
      if (!res.ok) return console.log("API error:", res.status);
      const data = await res.json();
      setUpcoming(data);
    } catch (error) {
      console.log("Network error:", error);
    }
  };

  const fetchCalendarClasses = async (student_id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/home/calendarClasses?student_id=${student_id}`);
      if (!res.ok) return console.log("API error:", res.status);
      const data = await res.json();
      setAllClasses(data);
    } catch (error) {
      console.log("Network error:", error);
    }
  };

  // --------------------
  // PULL-TO-REFRESH
  // --------------------
  const onRefresh = async () => {
    setRefreshing(true);

    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.type === "student") {
          await fetchUpcoming(u.user_id);
          await fetchCalendarClasses(u.user_id);
        }
      }
    } catch (e) {
      console.log("Refresh error:", e);
    }

    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user");
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleDayPress = (day: any) => {
    const selectedDateClasses = markedDates[day.dateString]?.classes || [];
    if (selectedDateClasses.length > 0) {
      alert(`You have ${selectedDateClasses.length} class(es) on ${day.dateString}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">

      <ScrollView
        className="flex-1 px-6 pt-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 300 }}
        refreshControl={     // << Added
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* Header */}
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold">Welcome, {user?.name}</Text>
          <View>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
              <Image
                source={require("../assets/images/avatar.jpg")}
                className="w-10 h-10 rounded-full"
              />
            </TouchableOpacity>

            {showMenu && (
              <View className="absolute right-0 mt-2 w-36 bg-white shadow-md rounded-lg border border-gray-200 z-50">
                <TouchableOpacity
                  className="px-4 py-3 border-b border-gray-200"
                  onPress={() => {
                    setShowMenu(false);
                    navigation.navigate("Profile", { user_id: user!.user_id });
                  }}
                >
                  <Text>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="px-4 py-3 border-b border-gray-200"
                  onPress={() => {
                    setShowMenu(false);
                    navigation.navigate("Settings");
                  }}
                >
                  <Text>Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="px-4 py-3 border-b border-gray-200"
                  onPress={() => {
                    setShowMenu(false);
                    navigation.navigate("Notifications");
                  }}
                >
                  <Text>Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="px-4 py-3"
                  onPress={() => {
                    setShowMenu(false);
                    handleLogout();
                  }}
                >
                  <Text className="text-red-500 font-semibold">Logout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Upcoming Class */}
        <View className="mt-6">
          <Text className="text-lg font-bold mb-3">Upcoming Class</Text>
          {upcoming.length > 0 ? (
            <View className="bg-gray-100 p-4 rounded-xl">
              <Text className="text-base font-semibold">{upcoming[0].subject}</Text>
              <Text className="text-sm text-gray-500">
                {new Date(upcoming[0].start_datetime).toLocaleString()}
              </Text>
              <Text className="text-sm text-gray-500">Tutor: {upcoming[0].tutor}</Text>
              <TouchableOpacity className="bg-blue-500 mt-3 py-2 rounded-lg">
                <Text className="text-white text-center">Join</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-gray-400">No upcoming classes</Text>
          )}
        </View>

        {/* Calendar */}
        <View className="mt-6">
          <Text className="text-lg font-bold mb-3">Calendar</Text>

          <Calendar
            current={new Date().toISOString().split('T')[0]}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            markingType="multi-dot"
            style={{
              borderRadius: 12,
              elevation: 2,
            }}
          />
        </View>

        {/* Images */}
        <View className="mt-10 flex-row justify-between">
          <View className="w-[48%] rounded-xl overflow-hidden ">
            <Image
              source={require("../assets/images/image 3.png")}
              className="w-full h-[60%]"
              resizeMode="contain"
            />
          </View>

          <View className="w-[48%] rounded-xl overflow-hidden">
            <Image
              source={require("../assets/images/image 4.png")}
              className="w-full h-[60%]"
              resizeMode="contain"
            />
          </View>
        </View>

        <View className="h-1000" />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0">
        <BottomBar />
      </View>
    </SafeAreaView>
  );
}
