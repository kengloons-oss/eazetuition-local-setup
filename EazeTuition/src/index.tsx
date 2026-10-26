import { Text, View, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

// 定义导航栈类型
type RootStackParamList = {
  Index: undefined;
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  AddStudent: { parent_id: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Index() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View className="flex-1 justify-center items-center bg-white px-6">
      <Text className="text-3xl text-accent font-bold mb-8">
        Welcome to EazeTuition
      </Text>

      <TouchableOpacity
        className="bg-blue-500 px-6 py-3 rounded-lg"
        onPress={() => navigation.navigate("Login")}
      >
        <Text className="text-white text-base font-semibold">Log In</Text>
      </TouchableOpacity>
    </View>
  );
}
