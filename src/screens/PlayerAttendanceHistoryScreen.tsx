import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { getTeamEvents } from '../config/firebase';
import { Event } from '../types/database';
import { theme } from '../theme';
import { format } from 'date-fns';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerAttendanceHistory'>;

interface EventWithAttendance extends Event {
  attended: boolean;
}

export const PlayerAttendanceHistoryScreen = ({ route }: Props) => {
  const { userId, userName, stats } = route.params;
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventWithAttendance[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const allEvents = await getTeamEvents(stats.teamId);
      
      // Filter events that have attendance marked and map with attendance status
      const eventsWithAttendance = allEvents
        .filter(event => event.attendees?.length > 0 || event.absentees?.length > 0)
        .map(event => ({
          ...event,
          attended: event.attendees?.includes(userId) || false
        }))
        .sort((a, b) => b.startTime.toDate().getTime() - a.startTime.toDate().getTime());

      setEvents(eventsWithAttendance);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEventItem = ({ item }: { item: EventWithAttendance }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDate}>
          {format(item.startTime.toDate(), 'MMM d, yyyy')} at {format(item.startTime.toDate(), 'h:mm a')}
        </Text>
        <Text style={styles.eventLocation}>{item.location}</Text>
      </View>
      <View style={[
        styles.attendanceStatus,
        { backgroundColor: item.attended ? theme.colors.success : '#FF5252' }
      ]}>
        <Text style={styles.attendanceText}>
          {item.attended ? 'Present' : 'Absent'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.playerName}>{userName}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Attendance Rate</Text>
            <Text style={styles.statValue}>{stats.percentage}%</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Events Attended</Text>
            <Text style={styles.statValue}>{stats.attendance.present}/{stats.attendance.total}</Text>
          </View>
        </View>
      </View>
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#2a305e',
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  listContainer: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  attendanceStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 10,
  },
  attendanceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 