import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import RecordingScreen from './app/screens/RecordingScreen';
import LibraryScreen from './app/screens/LibraryScreen';
import { initDatabase } from './app/database/Database';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    initDatabase()
      .then(() => console.log('Database initialized'))
      .catch(error => console.error('Database initialization failed:', error));
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Record') {
              iconName = focused ? 'mic' : 'mic-outline';
            } else if (route.name === 'Library') {
              iconName = focused ? 'library' : 'library-outline';
            }
            return <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen 
          name="Record" 
          component={RecordingScreen}
          options={{ title: 'Record Audio' }}
        />
        <Tab.Screen 
          name="Library" 
          component={LibraryScreen}
          options={{ title: 'My Recordings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
} 