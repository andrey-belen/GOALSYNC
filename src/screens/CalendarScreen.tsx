import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../theme';
import { getTeamEvents, auth, getUser, getTeamMembers, getEventAttendanceStatus } from '../config/firebase';
import { Event, TeamMember } from '../types/database';
import { getWeekDates, getMonthName, getDayName, getMonthDay, getDateRangeText } from '../utils/dateUtils';
import { isToday } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getEventIcon = (type: string) => {
  switch (type) {
    case 'training':
      return 'fitness';
    case 'match':
      return 'football';
    case 'meeting':
      return 'people';
    default:
      return 'calendar';
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case 'training':
      return '#4CAF50';
    case 'match':
      return '#e17777';
    case 'meeting':
      return '#2196F3';
    default:
      return '#999';
  }
};

const EventCard = ({ event, forceRefresh = 0 }: { event: Event, forceRefresh?: number }) => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [hasAttendance, setHasAttendance] = useState(false);
  const [checkingAttendance, setCheckingAttendance] = useState(true);
  const isTrainer = user?.type === 'trainer';

  const loadTeamMembers = async () => {
    if (user?.teamId) {
      const members = await getTeamMembers(user.teamId);
      setTeamMembers(members);
    }
  };

  useEffect(() => {
    const checkAttendance = async () => {
      try {
        setCheckingAttendance(true);
        const status = await getEventAttendanceStatus(event.id);
        setHasAttendance(status);
      } catch (error) {
        console.error('Error checking attendance status:', error);
      } finally {
        setCheckingAttendance(false);
      }
    };

    if (isTrainer) {
      checkAttendance();
    }
  }, [event.id, isTrainer, forceRefresh]);

  const handleEventPress = async () => {
    if (event.type === 'match') {
      // Always reload team members before navigating to ensure fresh data
      await loadTeamMembers();
      
      navigation.navigate('MatchDetails', {
        matchDetails: {
          id: event.id,
          title: event.title,
          date: event.startTime.toDate(),
          time: event.startTime.toDate(),
          location: event.location,
          isHomeGame: event.isHomeGame || false,
          opponent: event.opponent || '',
          formation: event.formation || '',
          players: event.roster?.map(p => ({
            ...p,
            status: teamMembers.find(m => m.id === p.id)?.status === 'injured' ? 'injured' : 'active'
          })) || [],
          notes: event.description
        }
      });
    } else if (isTrainer) {
      // For trainers, navigate to attendance screen for all event types
      navigation.navigate('Attendance', {
        eventId: event.id,
        eventType: event.type,
        title: event.title,
        date: event.startTime.toDate(),
        time: event.startTime.toDate(),
        location: event.location,
        notes: event.description
      });
    } else {
      // For players, show event details without attendance marking
      navigation.navigate('EventDetails', {
        eventId: event.id,
        title: event.title,
        type: event.type,
        date: event.startTime.toDate(),
        time: event.startTime.toDate(),
        location: event.location,
        notes: event.description
      });
    }
  };

  return (
    <TouchableOpacity style={styles.eventCard} onPress={handleEventPress}>
      <View style={[styles.eventIndicator, { backgroundColor: getEventColor(event.type) }]} />
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTime}>
            {event.startTime.toDate().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
          <View style={styles.eventTypeIcon}>
            <Ionicons name={getEventIcon(event.type)} size={14} color={getEventColor(event.type)} />
          </View>
        </View>
        <View style={styles.eventMainContent}>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.eventLocationContainer}>
              <Ionicons name="location" size={12} color="#666" />
              <Text style={styles.eventLocation}>{event.location}</Text>
            </View>
            {event.type === 'match' && event.roster && (
              <View style={styles.rosterPreview}>
                <Text style={styles.rosterText}>
                  {event.roster.length} players assigned
                </Text>
              </View>
            )}
          </View>
          {isTrainer && (
            <TouchableOpacity
              style={[
                styles.markAttendanceButton,
                hasAttendance && styles.attendanceMarkedButton
              ]}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('Attendance', {
                  eventId: event.id,
                  eventType: event.type,
                  title: event.title,
                  date: event.startTime.toDate(),
                  time: event.startTime.toDate(),
                  location: event.location,
                  notes: event.description
                });
              }}
            >
              {checkingAttendance ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons 
                    name={hasAttendance ? "checkmark-circle" : "checkbox-outline"} 
                    size={16} 
                    color="#fff" 
                  />
                  <Text style={styles.markAttendanceText}>
                    {hasAttendance ? 'View' : 'Mark'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const CalendarScreen = () => {
  const [currentWeek, setCurrentWeek] = useState(getWeekDates(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  useEffect(() => {
    loadTeamId();
  }, []);

  const loadEvents = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      const weekStart = new Date(currentWeek[0]);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(currentWeek[6]);
      weekEnd.setHours(23, 59, 59, 999);

      const teamEvents = await getTeamEvents(teamId, weekStart, weekEnd);
      setEvents(teamEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, [teamId, currentWeek]);

  useFocusEffect(
    useCallback(() => {
      if (teamId) {
        loadEvents();
        setRefreshKey(prev => prev + 1);
      }
    }, [teamId, currentWeek, loadEvents])
  );

  const loadTeamId = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userData = await getUser(currentUser.uid);
      if (userData?.teamId) {
        setTeamId(userData.teamId);
      }
    } catch (error) {
      console.error('Error loading team ID:', error);
    }
  };

  const handlePreviousWeek = () => {
    const firstDayOfWeek = new Date(currentWeek[0]);
    firstDayOfWeek.setDate(firstDayOfWeek.getDate() - 7);
    setCurrentWeek(getWeekDates(firstDayOfWeek));
  };

  const handleNextWeek = () => {
    const firstDayOfWeek = new Date(currentWeek[0]);
    firstDayOfWeek.setDate(firstDayOfWeek.getDate() + 7);
    setCurrentWeek(getWeekDates(firstDayOfWeek));
  };

  const handleToday = () => {
    setCurrentWeek(getWeekDates(new Date()));
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => {
      const eventDate = event.startTime.toDate().toISOString().split('T')[0];
      return eventDate === date;
    });
  };

  const isCurrentDay = (dateString: string) => {
    const date = new Date(dateString);
    return isToday(date);
  };

  const isPastDate = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    return date < today;
  };

  if (loading && !events.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.monthYear}>
          {getMonthName(currentWeek[0])} {new Date(currentWeek[0]).getFullYear()}
        </Text>
        <View style={styles.headerControls}>
          <TouchableOpacity onPress={handlePreviousWeek} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.dateRangeContainer}>
            <Text style={styles.dateRangeText}>
              {getDateRangeText(currentWeek[0], currentWeek[6])}
            </Text>
          </View>
          <TouchableOpacity onPress={handleNextWeek} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToday} style={styles.todayButton}>
            <Text style={styles.todayText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.calendarContainer}>
        {currentWeek.map(date => (
          <View key={date} style={styles.daySection}>
            <View style={[
              styles.dayHeader, 
              isCurrentDay(date) && styles.todayHeader,
              isPastDate(date) && styles.pastDateHeader
            ]}>
              <View>
                <Text style={[
                  styles.dayName,
                  isPastDate(date) && styles.pastDateText
                ]}>{getDayName(date)}</Text>
                <Text style={[
                  styles.dayNumber, 
                  isCurrentDay(date) && styles.todayText,
                  isPastDate(date) && styles.pastDateText
                ]}>
                  {getMonthDay(date)}
                </Text>
              </View>
              {isCurrentDay(date) && (
                <View style={styles.todayIndicator}>
                  <Text style={styles.todayIndicatorText}>TODAY</Text>
                </View>
              )}
            </View>
            <View style={styles.eventsContainer}>
              {getEventsForDate(date).map(event => (
                <EventCard key={event.id} event={event} forceRefresh={refreshKey} />
              ))}
              {getEventsForDate(date).length === 0 && (
                <View style={styles.noEventsContainer}>
                  <Text style={styles.noEventsText}>No events</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {user?.type === 'trainer' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('Schedule')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1f3d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1f3d',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a305e',
  },
  monthYear: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a305e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a305e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e17777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContainer: {
    flex: 1,
    padding: 20,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayHeader: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: -12,
  },
  dayName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  todayIndicator: {
    backgroundColor: '#e17777',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventsContainer: {
    paddingLeft: 12,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#2a305e',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  eventIndicator: {
    width: 3,
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventMainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    marginRight: 8,
  },
  eventTime: {
    fontSize: 13,
    color: '#e17777',
    fontWeight: '600',
  },
  eventTypeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  eventLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  noEventsContainer: {
    padding: 16,
    backgroundColor: '#2a305e',
    borderRadius: 12,
    alignItems: 'center',
  },
  noEventsText: {
    color: '#666',
    fontSize: 14,
  },
  dateRangeContainer: {
    backgroundColor: '#2a305e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    minWidth: 150,
    alignItems: 'center',
  },
  dateRangeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  rosterPreview: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rosterText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  pastDateHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: -12,
  },
  pastDateText: {
    color: '#666',
  },
  markAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
    gap: 4,
  },
  markAttendanceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  attendanceMarkedButton: {
    backgroundColor: theme.colors.success,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});