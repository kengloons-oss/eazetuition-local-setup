// app/screens/DummyScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function ChatScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f8f8',
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#333' }}>
        Chat Screen
      </Text>
    </View>
  );
}
