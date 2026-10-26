import * as React from 'react';
import { View } from 'react-native';
import { Button, TextInput, Text, Card, Avatar } from 'react-native-paper';

export default function TestPaperScreen() {
  const [name, setName] = React.useState('');

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Card>
        <Card.Title
          title="React Native Paper 🚀"
          subtitle="Material Design UI"
          left={(props) => <Avatar.Icon {...props} icon="account" />}
        />
        <Card.Content>
          <Text variant="bodyLarge">Hello, Paper UI!</Text>
          <TextInput
            label="Your name"
            value={name}
            onChangeText={setName}
            style={{ marginTop: 16 }}
          />
          <Button
            mode="contained"
            onPress={() => console.log(`Hello ${name}`)}
            style={{ marginTop: 16 }}
          >
            Submit
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}
