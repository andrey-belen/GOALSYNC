import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const quickActions = [
    {
      id: '1',
      title: 'Schedule Event',
      icon: 'calendar',
      onPress: () => navigation.navigate('Schedule'),
    },
    {
      id: '2',
      title: 'New Announcement',
      icon: 'megaphone',
      onPress: () => navigation.navigate('Announcement'),
    },
    {
      id: '3',
      title: 'Team Reports',
      icon: 'stats-chart',
      onPress: () => navigation.navigate('Reports'),
    },
  ];

  // Mock data for upcoming events
  const upcomingEvents = [
    {
      id: '1',
      type: 'match',
      title: 'Match vs Eagles',
      date: new Date('2024-03-25T15:00:00'),
      location: 'Home Field',
      attendance: 18,
      totalPlayers: 22,
    },
    {
      id: '2',
      type: 'training',
      title: 'Team Training',
      date: new Date('2024-03-23T10:00:00'),
      location: 'Training Ground',
      attendance: 20,
      totalPlayers: 22,
    },
  ];

  const renderQuickAction = (action: typeof quickActions[0]) => (
    <TouchableOpacity
      key={action.id}
      style={styles.quickActionCard}
      onPress={action.onPress}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons name={action.icon as any} size={24} color={theme.colors.primary} />
      </View>
      <Text style={styles.quickActionTitle}>{action.title}</Text>
    </TouchableOpacity>
  );

  const renderEventCard = (event: typeof upcomingEvents[0]) => (
    <TouchableOpacity
      key={event.id}
      style={styles.eventCard}
      onPress={() => {/* Handle event press */}}
    >
      <View style={styles.eventHeader}>
        <View style={styles.eventTypeContainer}>
          <Ionicons
            name={event.type === 'match' ? 'football' : 'fitness'}
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.eventType}>
            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
          </Text>
        </View>
        <View style={styles.attendanceContainer}>
          <Ionicons name="people" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.attendanceText}>
            {event.attendance}/{event.totalPlayers}
          </Text>
        </View>
      </View>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <View style={styles.eventDetails}>
        <View style={styles.eventDetail}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.eventDetailText}>
            {event.date.toLocaleDateString()} at {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.eventDetail}>
          <Ionicons name="location-outline" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.eventDetailText}>{event.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Dashboard</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={24} color={theme.colors.text.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {upcomingEvents.map(renderEventCard)}
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a305e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(82, 130, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventType: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  attendanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendanceText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
}); 