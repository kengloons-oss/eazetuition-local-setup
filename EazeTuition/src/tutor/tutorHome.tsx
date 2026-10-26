import { API_BASE_URL } from '../config';
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
import TutorBottomBar from "./tutorBottomBar";

type RootStackParamList = {
  Login: undefined;
  TutorHome: undefined;
  TutorClassList: undefined;
  HomeworkListPage: { tutor_id: number }; 
  TutorProfile: { user_id: number };
  Settings: undefined;
  TutorNotifications: undefined;
  ChatRoomList: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ClassStatus = 'upcoming' | 'attended' | 'absent' | 'ongoing';

interface ClassItem {
  schedule_id: number;
  class_detail_id: number;
  subject: string;
  start_datetime: string;
  end_datetime: string;
  room: string;
  status: ClassStatus;
}

interface User {
  name: string;
  user_id: number;
  type: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function TutorHome() {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [upcoming, setUpcoming] = useState<ClassItem[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);

  // --------------------
  // LOAD USER
  // --------------------
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const u: User = JSON.parse(storedUser);

        if (u.type !== "tutor") {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          return;
        }

        setUser(u);
        fetchUpcoming(u.user_id);
        fetchCalendarClasses(u.user_id);
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
        marks[date].dots.push({ key: item.schedule_id, color: dotColor });
      } else {
        marks[date] = {
          selected: true,
          selectedColor: backgroundColor,
          marked: true,
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
  const fetchUpcoming = async (user_id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/home/tutor/upcomingClass?user_id=${user_id}`);
      if (!res.ok) return console.log("API error:", res.status);
      const data: ClassItem[] = await res.json();
      setUpcoming(data);
    } catch (error) {
      console.log("Network error:", error);
    }
  };

  const fetchCalendarClasses = async (user_id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/home/tutor/calendarClasses?user_id=${user_id}`);
      if (!res.ok) return console.log("API error:", res.status);
      const data: ClassItem[] = await res.json();
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

    if (user) {
      await fetchUpcoming(user.user_id);
      await fetchCalendarClasses(user.user_id);
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

  // --------------------
  // RENDER
  // --------------------
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 pt-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 300 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold">Welcome, {user?.name}</Text>
          <View>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
              <Image
                source={require("../../assets/images/avatar.jpg")}
                className="w-10 h-10 rounded-full"
              />
            </TouchableOpacity>

            {showMenu && (
              <View className="absolute right-0 mt-2 w-36 bg-white shadow-md rounded-lg border border-gray-200 z-50">
                <TouchableOpacity
                  className="px-4 py-3 border-b border-gray-200"
                  onPress={() => {
                    setShowMenu(false);
                    navigation.navigate("TutorProfile", { user_id: user!.user_id });
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
                    navigation.navigate("TutorNotifications");
                  }}
                >
                  <Text>Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="px-4 py-3"
                  onPress={handleLogout}
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
              <Text className="text-sm text-gray-500">Room: {upcoming[0].room}</Text>
              <TouchableOpacity
                className="bg-blue-500 mt-3 py-2 rounded-lg"
                onPress={() => navigation.navigate("TutorClassList")}
              >
                <Text className="text-white text-center">View Class</Text>
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

        <View className="h-1000" />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0">
        <TutorBottomBar />
      </View>
    </SafeAreaView>
  );
}
