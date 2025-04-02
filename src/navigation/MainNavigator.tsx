import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { Dashboard } from '../screens/Dashboard';
import { TeamScreen } from '../screens/TeamScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AnnouncementScreen } from '../screens/AnnouncementScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { FormationTemplateScreen } from '../screens/FormationTemplateScreen';
import { FormationSetup } from '../screens/FormationSetup';
import { MatchDetails } from '../screens/MatchDetails';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { TeamManagement } from '../screens/TeamManagement';
import { QRScannerScreen } from '../screens/QRScannerScreen';
import { AttendanceDetails } from '../screens/AttendanceDetails';
import { PlayerAttendanceHistoryScreen } from '../screens/PlayerAttendanceHistoryScreen';
import { EventDetailsScreen } from '../screens/EventDetailsScreen';
import { useAuth } from '../contexts/AuthContext';
import { AllAnnouncementsScreen } from '../screens/AllAnnouncementsScreen';
import { AnnouncementDetailsScreen } from '../screens/AnnouncementDetailsScreen';
import { MatchStatsScreen } from '../screens/MatchStatsScreen';
import { UploadMatchStatsScreen } from '../screens/UploadMatchStatsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TabNavigator = () => {
  const { user } = useAuth();
  const isTrainer = user?.type === 'trainer';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Team') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#e17777',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#2a305e',
          borderTopColor: '#3d4374',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={Dashboard}
        options={{
          title: 'Dashboard'
        }}
      />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        initialParams={{ teamId: user?.teamId || 'default' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const MainNavigator = () => {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1a1f3d' },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="Announcement" component={AnnouncementScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="FormationTemplate" component={FormationTemplateScreen} />
      <Stack.Screen name="FormationSetup" component={FormationSetup} />
      <Stack.Screen 
        name="MatchDetails" 
        component={MatchDetails}
        options={{
          headerShown: true,
          title: 'Match Details',
          headerStyle: {
            backgroundColor: '#1a1f3d',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="MatchStats" 
        component={MatchStatsScreen}
        options={{
          headerShown: true,
          title: 'Match Statistics',
          headerStyle: {
            backgroundColor: '#1a1f3d',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="UploadMatchStats" 
        component={UploadMatchStatsScreen}
        options={{
          headerShown: true,
          title: 'Upload Statistics',
          headerStyle: {
            backgroundColor: '#1a1f3d',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="Attendance" 
        component={AttendanceScreen}
        options={{
          headerShown: true,
          title: 'Attendance',
          headerStyle: {
            backgroundColor: '#1a1f3d',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="TeamManagement" component={TeamManagement} />
      <Stack.Screen 
        name="AllAnnouncements" 
        component={AllAnnouncementsScreen}
        options={{
          headerShown: true,
          title: 'Announcements',
          headerStyle: {
            backgroundColor: '#1a1f3d',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="AttendanceDetails" 
        component={AttendanceDetails}
        options={{
          headerShown: true,
          title: 'Team Attendance',
          headerStyle: {
            backgroundColor: '#1a1f3d',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="PlayerAttendanceHistory" 
        component={PlayerAttendanceHistoryScreen}
        options={{
          headerShown: true,
          title: 'My Attendance',
          headerStyle: {
            backgroundColor: '#1a1f3d',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
        options={{
          headerShown: true,
          title: 'Event Details',
          headerStyle: {
            backgroundColor: '#1a1f3d',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="AnnouncementDetails"
        component={AnnouncementDetailsScreen}
        options={{
          headerShown: true,
          title: 'Announcement',
          headerStyle: {
            backgroundColor: '#1a1f3d',
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}; 