import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Login } from '../screens/Login';
import { Register } from '../screens/Register';
import { ForgotPassword } from '../screens/ForgotPassword';
import { MainTabs } from './MainTabs';
import { EventDetails } from '../screens/EventDetails';
import { EditEvent } from '../screens/EditEvent';
import { CreateEvent } from '../screens/CreateEvent';
import { Chat } from '../screens/Chat';
import { AttendanceDetails } from '../screens/AttendanceDetails';
import { MatchStatsScreen } from '../screens/MatchStatsScreen';
import { MatchDetails } from '../screens/MatchDetails';
import { UploadMatchStatsScreen } from '../screens/UploadMatchStatsScreen';
import { SubmitPlayerStatsScreen } from '../screens/SubmitPlayerStatsScreen';
import { Notifications } from '../screens/Notifications';
import { AllUpdates } from '../screens/AllUpdates';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={Login}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={Register}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPassword}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetails}
        options={{ title: 'Event Details' }}
      />
      <Stack.Screen 
        name="EditEvent" 
        component={EditEvent}
        options={{ title: 'Edit Event' }}
      />
      <Stack.Screen 
        name="CreateEvent" 
        component={CreateEvent}
        options={{ title: 'Create Event' }}
      />
      <Stack.Screen 
        name="Chat" 
        component={Chat}
        options={{ title: 'Team Chat' }}
      />
      <Stack.Screen 
        name="AttendanceDetails" 
        component={AttendanceDetails}
        options={{
          title: 'Attendance Details',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen 
        name="MatchStats" 
        component={MatchStatsScreen}
        options={{ title: 'Match Statistics' }}
      />
      <Stack.Screen 
        name="MatchDetails" 
        component={MatchDetails}
        options={{ title: 'Match Details' }}
      />
      <Stack.Screen 
        name="UploadMatchStats" 
        component={UploadMatchStatsScreen}
        options={{ title: 'Upload Statistics' }}
      />
      <Stack.Screen 
        name="SubmitPlayerStats" 
        component={SubmitPlayerStatsScreen}
        options={{ title: 'Submit Player Statistics' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={Notifications}
        options={{ 
          title: 'Notifications',
          headerShown: false 
        }}
      />
      <Stack.Screen 
        name="AllUpdates" 
        component={AllUpdates}
        options={{ 
          title: 'Updates',
          headerShown: false 
        }}
      />
    </Stack.Navigator>
  );
}; 