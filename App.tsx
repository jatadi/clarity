import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecordingScreen from './app/screens/RecordingScreen';
import { initDatabase } from './app/database/Database';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    initDatabase()
      .then(() => console.log('Database initialized'))
      .catch(error => console.error('Database initialization failed:', error));
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Record" 
          component={RecordingScreen}
          options={{ title: 'Record Audio' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 