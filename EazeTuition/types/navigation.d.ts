declare module '@react-navigation/bottom-tabs';
declare module '@react-navigation/native-stack';
declare module "react-native-vector-icons/MaterialCommunityIcons" {
  import { Icon } from "react-native-vector-icons/Icon";
  export default Icon;
}

declare module "react-native-vector-icons/FontAwesome" {
  import { Icon } from "react-native-vector-icons/Icon";
  export default Icon;
}


import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootTabParamList = {
  Home: undefined;
  Classes: undefined;
  Class?: undefined;
  Service?: undefined;
  Chat?: undefined;
  Notifications?: undefined;
  TutorHome?: undefined;
  ParentProfile: { user_id: number };
  Payment?: undefined;
  AddStudent?: undefined;
  Login?: undefined;
  EnrollNewClass: { student: any; };
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;

  AddStudent: { parent_id?: number };
  EnrollNewClass: { student: any };

  ParentProfile: undefined;
  ParentUpdateProfile: {profile: any};

  PaymentHistory: undefined;
  PaymentDetail: undefined;

  ManageChildScreen: undefined;
  EvaluationTestScreen: undefined;
  ClassDetailScreen: undefined;
  AttendanceScreen: undefined;
  
  ServiceEnrollmentDetail: { service_enrollment_id: number;  };
  EnrollNewService: {student: any};

  ChatRoom: {chat_room_id: number};
  ChatRoomList: undefined;

  TutorProfile: {user_id: number};
  Profile: {user_id: number};
};


declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList { }
  }
}
