import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Profile: { user_id: number };
  SettingsScreen: undefined;
  Notifications: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export default function Header({ title, showBackButton = false }: HeaderProps) {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = useState<{ name: string; user_id: number; type?: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const loadUserAndSettings = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
      else navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

      const darkPref = await AsyncStorage.getItem('darkMode');
      if (darkPref !== null) setDarkMode(darkPref === 'true');

      const notifPref = await AsyncStorage.getItem('notificationsEnabled');
      if (notifPref !== null) setNotificationsEnabled(notifPref === 'true');
    };
    loadUserAndSettings();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const toggleDarkMode = async () => {
    setDarkMode(prev => {
      AsyncStorage.setItem('darkMode', (!prev).toString());
      return !prev;
    });
  };

  const toggleNotifications = async () => {
    setNotificationsEnabled(prev => {
      AsyncStorage.setItem('notificationsEnabled', (!prev).toString());
      return !prev;
    });
  };

  if (!user) return null;

  return (
    <View className="flex-row justify-between items-center px-6 pt-4 pb-4 bg-white border-gray-200">
      <View className="flex-1">
        {showBackButton ? (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#3b82f6" />
          </TouchableOpacity>
        ) : (
          <Text className="text-xl font-bold text-gray-900">{title || `Welcome, ${user.name}`}</Text>
        )}
      </View>

      <View>
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
          <Image
            source={require('../assets/images/avatar.jpg')}
            className="w-10 h-10 rounded-full"
          />
        </TouchableOpacity>

        {showMenu && (
          <View className="absolute right-0 mt-2 w-56 bg-white shadow-md rounded-lg border border-gray-200 z-50">
            <TouchableOpacity
              className="px-4 py-3 border-b border-gray-200"
              onPress={() => {
                setShowMenu(false);
                navigation.navigate('Profile', { user_id: user.user_id });
              }}
            >
              <Text>Profile</Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              className="px-4 py-3 border-b border-gray-200"
              onPress={() => {
                setShowMenu(false);
                navigation.navigate('SettingsScreen');
              }}
            >
              <Text>Settings</Text>
            </TouchableOpacity>

            {/* Dark Mode Toggle */}
            <View className="px-4 py-3 border-b border-gray-200 flex-row justify-between items-center">
              <Text>Dark Mode</Text>
              <Switch value={darkMode} onValueChange={toggleDarkMode} />
            </View>

            {/* Notifications Toggle */}
            <View className="px-4 py-3 border-b border-gray-200 flex-row justify-between items-center">
              <Text>Notifications</Text>
              <Switch value={notificationsEnabled} onValueChange={toggleNotifications} />
            </View>

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
  );
}
