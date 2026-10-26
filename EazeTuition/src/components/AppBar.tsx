import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Pressable,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types/navigation";

interface AppBarProps {
  title?: string;
  variant?: "menu" | "back" | "none";
}

export default function AppBar({ title, variant = "menu" }: AppBarProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  const [menuVisible, setMenuVisible] = useState(false);
  const [isMenuRendered, setIsMenuRendered] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [childrenExpanded, setChildrenExpanded] = useState(false);

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const childrenAnim = useRef(new Animated.Value(0)).current;

  const TITLE_MAP: Record<string, string> = {
    MainTabs: "Home",
    ParentHome: "Home",
    Timetable: "Timetable",
    Service: "Services",
    Chat: "Chat Room",
    Profile: "Profile",

    // stack routes
    PaymentHistory: "Payment History",
    "Payment Detail": "Payment Detail",
    ManageChildScreen: "Manage Child",
    AddStudent: "Add Child",
    ServiceEnrollmentDetail: "Service Detail",
    EnrollNewService: "Enroll Service",
    EnrollNewClass: "Enroll Class",

    Notifications: "Notifications",
    AttendanceScreen: "Attendance",
    ClassDetailScreen: "Class Detail",
    UpcomingClassScreen: "Upcoming Class",

    EvaluationTestScreen: "Evaluation Test",
    EvaluateNextTestScreen: "Next Test",

    HomeworkScreen: "Homework",
    HomeworkDetailsScreen: "Homework Detail",

    TutorHome: "Tutor Home",
    TutorTimetable: "Tutor Timetable",
    TutorClassList: "Class List",
    HomeworkListPage: "Homework List",
    CreateHomeworkPage: "Create Homework",
    HomeworkDetailsPage: "Homework Details",
  };


  const getReadableTitle = (name: string) => {
    return name
      .replace(/Screen$/, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
  };

  // ✅ 动态确定标题（优先使用 props.title）
  let currentTitle = title;

  // MENU 代表底部导航 → 强制使用 props.title
  if (variant === "menu") {
    currentTitle = title ?? "";
  }
  // BACK / NONE → 从 Stack route 取标题
  else {
    currentTitle =
      TITLE_MAP[route.name] ||
      title ||
      getReadableTitle(route.name);
  }


  // ✅ 获取用户资料
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await AsyncStorage.getItem("user");
        if (data) setUser(JSON.parse(data));
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };
    loadUser();
  }, []);

  // ✅ 菜单动画逻辑
  useEffect(() => {
    if (menuVisible) {
      setIsMenuRendered(true);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -300, duration: 250, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setIsMenuRendered(false));
    }
  }, [menuVisible]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const childrenHeight = childrenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  const childrenOpacity = childrenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const toggleChildren = () => {
    setChildrenExpanded(prev => {
      const next = !prev;
      Animated.timing(childrenAnim, {
        toValue: next ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
      return next;
    });
  };

  const handleNavigate = (target: keyof RootStackParamList, params?: any) => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -300, duration: 200, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
      navigation.navigate(target, params);
    });
  };


  return (
    <>
      {/* 顶部 AppBar */}
      <View
        className="bg-white flex-row justify-between items-center px-6 py-2 shadow-md"
        style={{ paddingTop: insets.top + 10, zIndex: 20, elevation: 20 }}
      >
        {/* 左侧按钮 */}
        {variant === "menu" ? (
          <TouchableOpacity onPress={() => setMenuVisible((prev) => !prev)} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Ionicons name={menuVisible ? "close" : "menu"} size={28} color="#007BFF" />
            </Animated.View>
          </TouchableOpacity>
        ) : variant === "back" ? (
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={26} color="#007BFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} /> // show nothing
        )}


        {/* ✅ 中间标题（动态更新） */}
        <Text className="text-lg font-bold text-gray-800">{currentTitle}</Text>

        {/* 用户头像 */}
        <TouchableOpacity
          onPress={() => {
            if (!user) return;

            if (user.type === "parent") {
              navigation.navigate("ParentProfile");
            } else if (user.type === "tutor") {
              navigation.navigate("TutorProfile", { user_id: user.user_id });
            } else {
              // student
              navigation.navigate("Profile", { user_id: user.user_id });
            }
          }}
        >

          {user?.profile_pic || user?.profilePicUrl ? (
            <View className="w-10 h-10 rounded-full overflow-hidden">
              <Image
                source={{ uri: user.profile_pic || user.profilePicUrl }}
                className="w-full h-full"
              />
            </View>
          ) : (
            <Ionicons name="person-circle" size={36} color="#007BFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* 侧边菜单 */}
      {isMenuRendered && (
        <>
          {/* 背景遮罩 */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              opacity: fadeAnim,
              zIndex: 9,
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={() => setMenuVisible(false)} />
          </Animated.View>

          {/* 菜单主体 */}
          <Animated.View
            style={{
              position: "absolute",
              top: insets.top + 55,
              left: 0,
              bottom: 0,
              transform: [{ translateX: slideAnim }],
              width: Dimensions.get("window").width * 0.55,
              backgroundColor: "white",
              borderTopRightRadius: 16,
              borderBottomRightRadius: 16,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 19,
              paddingHorizontal: 20,
              paddingTop: 25,
            }}
          >
            {/* 顶部渐变阴影 */}
            <LinearGradient
              colors={["rgba(0,0,0,0.08)", "transparent"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }}
            />

            {/* 底部渐变阴影 */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.06)"]}
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 25 }}
            />

            {/* 用户资料 */}
            <View style={{ alignItems: "center", marginBottom: 20, paddingTop: 10 }}>
              {user?.profile_pic || user?.profilePicUrl ? (
                <Image
                  source={{ uri: user.profile_pic || user.profilePicUrl }}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    marginBottom: 8,
                  }}
                />
              ) : (
                <Ionicons name="person-circle" size={70} color="#007BFF" />
              )}
              <Text style={{ fontWeight: "600", fontSize: 18, marginTop: 6 }}>
                {user?.name || "Guest"}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: "#EEE", marginVertical: 14 }} />

            {/* Payment */}
            <TouchableOpacity
              onPress={() => handleNavigate("PaymentHistory")}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}
            >
              <Ionicons name="card-outline" size={22} color="#007BFF" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: "#333" }}>Payment</Text>
            </TouchableOpacity>

            {/* Children Category */}
            <TouchableOpacity
              onPress={toggleChildren}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="people-outline" size={22} color="#007BFF" style={{ marginRight: 12 }} />
                <Text style={{ fontSize: 16, color: "#333" }}>Children</Text>
              </View>
              <Ionicons
                name={childrenExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#007BFF"
              />
            </TouchableOpacity>

            <Animated.View
              style={{
                overflow: "hidden",
                opacity: childrenOpacity,
                height: childrenHeight,
                marginLeft: 36,
              }}
            >
              {/* Manage Child */}
              <TouchableOpacity
                onPress={() => handleNavigate("ManageChildScreen")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                }}
              >
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color="#007BFF"
                  style={{ marginRight: 10 }}
                />
                <Text style={{ fontSize: 15, color: "#333" }}>Manage Child</Text>
              </TouchableOpacity>

              {/* Add Child */}
              <TouchableOpacity
                onPress={() => handleNavigate("AddStudent", { parent_id: user?.parent_id })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                }}
              >
                <Ionicons
                  name="person-add-outline"
                  size={20}
                  color="#007BFF"
                  style={{ marginRight: 10 }}
                />
                <Text style={{ fontSize: 15, color: "#333" }}>Add Child</Text>
              </TouchableOpacity>
            </Animated.View>


            {/* Logout */}
            <TouchableOpacity
              onPress={() => handleNavigate("Login")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                marginTop: 10,
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color="#FF5555"
                style={{ marginRight: 12 }}
              />
              <Text style={{ fontSize: 16, color: "#FF5555" }}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </>
  );
}
