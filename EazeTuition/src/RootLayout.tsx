
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState, useEffect } from "react";
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme, View, Text } from 'react-native';
import { StripeProvider } from "@stripe/stripe-react-native";
import {
  PaperProvider,
  MD3LightTheme as LightTheme,
  MD3DarkTheme as DarkTheme,
} from 'react-native-paper';

import MainTabs from './BottomNav';
import AppBar from './components/AppBar';
import useLocalSync from "./hooks/useLocalSync";

import ChatPoilingListener from "./components/ChatPolingListener";
import { NotificationProvider } from "./components/NotificationContext";
import { ChatProvider } from "./components/ChatContext";

import Index from './index';
import LoginScreen from './Login';
import SignUpScreen from './SignUp';
import ForgotPasswordScreen from './forgotPassword';
import VerifyOTPScreen from './verifyOTP';
import SetNewPasswordScreen from './setNewPassword';
import AddStudentScreen from './addStudent';
import HomeScreen from './home';
import ProfileScreen from './profile';
import UpdateProfileScreen from './updateProfile';
import EvaluationTestScreen from './EvaluationTestScreen';
import EvaluateNextTestScreen from './EvaluateNextTestScreen';
import NotificationScreen from './NotificationScreen';
import UpcomingClassScreen from './UpcomingClassScreen';
import ClassDetailScreen from './ClassDetailScreen';
import AttendanceScreen from './AttendanceScreen';
import HomeworkScreen from './HomeworkScreen';
import HomeworkDetailsScreen from './HomeworkDetailsScreen';
import ProgressScreen from './ProgressScreen';

import { STRIPE_PUBLISHABLE_KEY } from './config';

// tutor
import TutorLogin from './tutor/tutorLogin';
import TutorHome from './tutor/tutorHome';
import TutorClassList from './tutor/tutorClassList';
import ClassAttendance from './tutor/tutorClassAttendance';
import TutorHomeworkList from './tutor/tutorHomeworkList';
import CreateHomeworkPage from './tutor/tutorCreateHomework';
import HomeworkDetailsPage from './tutor/tutorHomeworkDetail';
import TutorBottomBar from './tutor/tutorBottomBar';
import TutorHeader from './tutor/tutorHeader';
import TutorProfile from './tutor/tutorProfile';
import TutorUpdateProfile from './tutor/tutorUpdateProfile';
import SubmissionPreviewPage from './tutor/tutorSubmissionPreviewPage';
import TutorNotificationScreen from './tutor/tutorNotificationScreen';

// parent
import ParentProfile from './parent/ParentProfile';
import ParentUpdateProfile from './parent/ParentUpdateProfile';
import PaymentHistoryScreen from './parent/PaymentHistoryScreen';
import ManageChildScreen from './parent/ManageChildScreen';
import MakePaymentScreen from './parent/MakePaymentScreen';
import EnrollNewClassScreen from './parent/EnrollNewClassScreen';
import ServiceEnrollmentDetailScreen from './parent/ServiceEnrollmentDetailScreen';
import EnrollNewServiceScreen from './parent/EnrollNewServiceScreen';
import ChatRoomScreen from './ChatRoomScreen';
import ChatRoomListScreen from './ChatRoomLIstScreen';
import ParentNotificationScreen from './parent/ParentNotificationScreen';
import TutorTimeTableScreen from './tutor/tutorTimetableScreen';
// import TutorHome from './tutor/tutorHome';

// -----------------------
const Stack = createNativeStackNavigator();

export default function RootLayout() {
  const [user, setUser] = useState<any | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 🎨 Fluent-inspired color palette
  const fluentBlue = '#0078D4'; // Fluent主色
  const fluentBlueLight = '#E6F0FA'; // 浅蓝，用于背景和TextInput
  const fluentBlueDark = '#005A9E'; // 深蓝，用于深色模式
  const fluentBorder = '#C7E0F4';

  // 🌈 Custom Fluent-like theme
  const theme = {
    ...(isDark ? DarkTheme : LightTheme),
    roundness: 8, // 方圆按钮
    colors: {
      ...(isDark ? DarkTheme.colors : LightTheme.colors),
      primary: fluentBlue,
      secondary: fluentBlueDark,
      background: isDark ? '#1E1E1E' : '#F4F7FB',
      surface: isDark ? '#252526' : '#FFFFFF',
      onPrimary: '#FFFFFF',
      onSurface: isDark ? '#FFFFFF' : '#000000',
      outline: fluentBorder,
      surfaceVariant: isDark ? '#3C3C3C' : fluentBlueLight,
    },
    components: {
      // React Native Paper v5 支持通过 theme.components 定义默认样式
      Button: {
        style: {
          borderRadius: 8, // 所有按钮方圆
        },
      },
      TextInput: {
        style: {
          backgroundColor: fluentBlueLight, // 浅蓝背景
          borderRadius: 8,
        },
        outlineColor: fluentBorder,
        activeOutlineColor: fluentBlue,
      },
    },
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await AsyncStorage.getItem("user");
        if (data) {
          const parsedUser = JSON.parse(data);
          setUser(parsedUser);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  useLocalSync(user);
  // if (loading) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  //       <Text>Loading...</Text>
  //     </View>
  //   );
  // }
  if (loading) {
    return;
  }



  return (
    <NotificationProvider>
      <ChatProvider>
        <PaperProvider theme={theme}>

          <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
            <NavigationContainer>
              {user && <ChatPoilingListener userId={user.user_id} />}

              <Stack.Navigator
                /*initialRouteName={isLoggedIn ? "MainTabs" : "Login"}*/
                screenOptions={({ route }) => {
                  // ✅ Routes that should not have ANY header (login, etc.)
                  const noAppBarRoutes = [
                    "Login",
                    "SignUp",
                    "Index",
                    "ForgotPassword",
                    "VerifyOTP",
                    "SetNewPassword",
                    "TutorLogin",
                    "Home",
                    "HomeworkScreen",
                    "Progress",
                    "UpcomingClassScreen",
                    "TutorHome",
                    "Notifications",
                    "HomeworkDetailsScreen",
                    "ClassDetailScreen",
                    "AttendanceScreen"
                    // "TutorProfile",
                    // "TutorClassList",
                    // "HomeworkListPage",
                  ];

                  const menuRoutes = [
                    "MainTabs",
                    "ParentHome",
                    "Profile",
                    "Class",
                    "Service",
                    "Chat"
                  ];

                  const backRoutes = [
                    "ChatRoom",
                    "PaymentHistory",
                    "Payment Detail",
                    "ManageChildScreen",
                    "ServiceEnrollmentDetail",
                    "EnrollNewService",
                    "EnrollNewClass",
                    "ParentProfile",
                    "ParentUpdateProfile",
                    "AddStudent"
                  ];

                  // ✅ Disable Stack AppBar for MainTabs ("Home")
                  if (menuRoutes.includes(route.name)) {
                    return { headerShown: false };
                  }

                  // ✅ Hide AppBar for login/register-type pages
                  if (noAppBarRoutes.includes(route.name)) {
                    return { headerShown: false };
                  }

                  // ✅ Hide AppBar for login/register-type pages
                  if (backRoutes.includes(route.name)) {
                    return {
                      header: () => <AppBar title={route.name} variant="back" />,
                      headerShown: true,
                    };
                  }

                  // ✅ All other pages use a back AppBar
                  return {
                    header: () => <AppBar title={route.name} variant="none" />,
                    headerShown: true,
                  };
                }}
              >
                <Stack.Screen name="Index" component={Index} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
                <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} />
                <Stack.Screen name="TutorLogin" component={TutorLogin} />


                <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
                <Stack.Screen name="ChatRoomList" component={ChatRoomListScreen} />

                <Stack.Screen
                  name="MainTabs"
                  component={MainTabs}
                  options={{ headerShown: false }}
                />


                <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
                <Stack.Screen name="Payment Detail" component={MakePaymentScreen} />
                <Stack.Screen name="EnrollNewClass" component={EnrollNewClassScreen} />
                <Stack.Screen name="ManageChildScreen" component={ManageChildScreen} />
                <Stack.Screen name="AddStudent" component={AddStudentScreen} />
                <Stack.Screen name="ParentProfile" component={ParentProfile} />
                <Stack.Screen name="ParentUpdateProfile" component={ParentUpdateProfile} />
                <Stack.Screen name="ServiceEnrollmentDetail" component={ServiceEnrollmentDetailScreen} />
                <Stack.Screen name="EnrollNewService" component={EnrollNewServiceScreen} />
                <Stack.Screen name="ParentNotificationScreen" component={ParentNotificationScreen} />


                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="UpdateProfile" component={UpdateProfileScreen} />
                <Stack.Screen name="EvaluationTestScreen" component={EvaluationTestScreen} />
                <Stack.Screen name="EvaluateNextTestScreen" component={EvaluateNextTestScreen} />
                <Stack.Screen name="Notifications" component={NotificationScreen} />
                <Stack.Screen name="UpcomingClassScreen" component={UpcomingClassScreen} />
                <Stack.Screen name="ClassDetailScreen" component={ClassDetailScreen} />
                <Stack.Screen name="HomeworkScreen" component={HomeworkScreen} />
                <Stack.Screen name="HomeworkDetailsScreen" component={HomeworkDetailsScreen} />
                <Stack.Screen name="Progress" component={ProgressScreen} />
                <Stack.Screen name="AttendanceScreen" component={AttendanceScreen} />


                <Stack.Screen name="TutorHome" component={TutorHome} />
                <Stack.Screen name="TutorClassList" component={TutorClassList} />
                <Stack.Screen name="TutorBottomBar" component={TutorBottomBar} />
                <Stack.Screen name="TutorHeader" component={TutorHeader} />
                <Stack.Screen name="TutorProfile" component={TutorProfile} />
                <Stack.Screen name="TutorUpdateProfile" component={TutorUpdateProfile} />
                <Stack.Screen name="TutorTimetable" component={TutorTimeTableScreen} />
                <Stack.Screen name="TutorNotifications" component={TutorNotificationScreen} />
                <Stack.Screen name="ClassAttendance" component={ClassAttendance} />
                <Stack.Screen name="HomeworkListPage" component={TutorHomeworkList} />
                <Stack.Screen name="CreateHomeworkPage" component={CreateHomeworkPage} />
                <Stack.Screen name="HomeworkDetailsPage" component={HomeworkDetailsPage} />
                <Stack.Screen name="SubmissionPreviewPage" component={SubmissionPreviewPage} />


              </Stack.Navigator>
            </NavigationContainer>

          </StripeProvider>

        </PaperProvider>
      </ChatProvider>

    </NotificationProvider>

  );
}
