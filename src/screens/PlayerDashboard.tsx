import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { getPendingInvitations, acceptInvitation, declineInvitation, getTeamEvents, getTeamAttendanceStats, getPlayerStatsNotifications } from '../config/firebase';
import { theme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Event, TeamMember } from '../types/database';
import { isToday, format } from 'date-fns';
import { PlayerAttendanceCard } from '../components/PlayerAttendanceCard';
import { PlayerPositionCard } from '../components/PlayerPositionCard';
import { AnnouncementsCard } from '../components/AnnouncementsCard';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { NotificationsSection } from '../components/NotificationsSection';

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

export const PlayerDashboard = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [playerStats, setPlayerStats] = useState<{
    attendance: { present: number; total: number };
    percentage: number;
  } | null>(null);
  const [statsNotifications, setStatsNotifications] = useState<{
    pendingApproval: any[];
    approved: any[];
    rejected: any[];
    needsSubmission: any[];
  } | null>(null);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    if (user?.email) {
      loadInvitations();
    }
  }, [user]);

  useEffect(() => {
    if (user?.teamId) {
      loadEvents();
      loadPlayerStats();
    }
  }, [user?.teamId]);

  useEffect(() => {
    if (user?.id) {
      loadStatsNotifications();
    }
  }, [user?.id]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      // Get events for today and the next 7 days
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const events = await getTeamEvents(user!.teamId!, today, nextWeek);
      
      // Split events into today and upcoming
      const todayEvts = events.filter(event => 
        isToday(event.startTime.toDate())
      ).sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());

      const upcomingEvts = events.filter(event => 
        !isToday(event.startTime.toDate())
      ).sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());

      setTodayEvents(todayEvts);
      setUpcomingEvents(upcomingEvts);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const pendingInvitations = await getPendingInvitations(user!.email);
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerStats = async () => {
    try {
      if (user?.teamId) {
        const stats = await getTeamAttendanceStats(user.teamId);
        const playerStat = stats.playerStats.find(p => p.id === user.id);
        if (playerStat) {
          setPlayerStats({
            attendance: playerStat.attendance,
            percentage: playerStat.percentage,
          });
        }
      }
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  };

  const loadStatsNotifications = async () => {
    try {
      if (!user?.id) return;
      
      const stats = await getPlayerStatsNotifications(user.id);
      setStatsNotifications(stats);
    } catch (error) {
      console.error('Error loading stats notifications:', error);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setLoading(true);
      await acceptInvitation(invitationId);
      Alert.alert('Success', 'You have joined the team!');
      await loadInvitations();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setLoading(true);
      await declineInvitation(invitationId);
      Alert.alert('Success', 'Invitation declined');
      await loadInvitations();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline invitation');
    } finally {
      setLoading(false);
    }
  };

  const renderInvitations = () => {
    if (invitations.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Invitations</Text>
        {invitations.map((invitation) => (
          <View key={invitation.id} style={styles.invitationItem}>
            <View style={styles.invitationInfo}>
              <Text style={styles.invitationText}>
                You have been invited to join {invitation.teamName}
              </Text>
              <Text style={styles.invitationDetails}>
                Position: {invitation.position}
                {'\n'}
                Jersey #: {invitation.number}
              </Text>
              <Text style={styles.invitationDate}>
                {new Date(invitation.createdAt.seconds * 1000).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.invitationButtons}>
              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={() => handleAcceptInvitation(invitation.id)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={() => handleDeclineInvitation(invitation.id)}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderEventCard = (event: Event) => (
    <TouchableOpacity 
      key={event.id} 
      style={styles.scheduleItem}
      onPress={() => {
        if (event.type === 'match') {
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
              players: event.roster || [],
              notes: event.description
            }
          });
        } else {
          navigation.navigate('Attendance', {
            eventId: event.id,
            eventType: event.type,
            title: event.title,
            date: event.startTime.toDate(),
            time: event.startTime.toDate(),
            location: event.location,
            notes: event.description
          });
        }
      }}
    >
      <View style={styles.eventHeader}>
        <View style={styles.eventTypeContainer}>
          <Ionicons 
            name={getEventIcon(event.type)} 
            size={20} 
            color={getEventColor(event.type)} 
          />
          <Text style={[styles.scheduleText, { marginLeft: 8 }]}>
            {event.title}
          </Text>
        </View>
        <Text style={[styles.scheduleTime, { color: getEventColor(event.type) }]}>
          {format(event.startTime.toDate(), 'h:mm a')}
        </Text>
      </View>
      <View style={styles.eventLocationContainer}>
        <Ionicons name="location" size={14} color={theme.colors.text.secondary} />
        <Text style={styles.eventLocation}>{event.location}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderStatsNotifications = () => {
    if (!statsNotifications) return null;
    
    const needsSubmissionCount = statsNotifications.needsSubmission.length;
    const pendingCount = statsNotifications.pendingApproval.length;
    const rejectedCount = statsNotifications.rejected.length;
    
    if (needsSubmissionCount === 0 && pendingCount === 0 && rejectedCount === 0) {
      return null;
    }
    
    return (
      <View style={styles.statsNotificationsSection}>
        <Text style={styles.sectionTitle}>Match Statistics</Text>
        
        {needsSubmissionCount > 0 && (
          <TouchableOpacity 
            style={styles.notificationItem}
            onPress={() => {
              navigation.navigate('MatchStats', {
                matchId: statsNotifications.needsSubmission[0].id,
                isHomeGame: true,
              });
            }}
          >
            <View style={[styles.notificationIcon, { backgroundColor: `${theme.colors.warning}20` }]}>
              <Ionicons name="create-outline" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>
                Submit Match Statistics
              </Text>
              <Text style={styles.notificationMessage}>
                {needsSubmissionCount} match{needsSubmissionCount !== 1 ? 'es' : ''} waiting for your statistics
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
        
        {pendingCount > 0 && (
          <TouchableOpacity 
            style={[styles.notificationItem, needsSubmissionCount > 0 && styles.notificationItemMargin]}
            onPress={() => {
              navigation.navigate('MatchStats', {
                matchId: statsNotifications.pendingApproval[0].matchId,
                isHomeGame: true,
              });
            }}
          >
            <View style={[styles.notificationIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>
                Pending Approval
              </Text>
              <Text style={styles.notificationMessage}>
                {pendingCount} stat submission{pendingCount !== 1 ? 's' : ''} pending trainer approval
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
        
        {rejectedCount > 0 && (
          <TouchableOpacity 
            style={[
              styles.notificationItem, 
              (needsSubmissionCount > 0 || pendingCount > 0) && styles.notificationItemMargin
            ]}
            onPress={() => {
              navigation.navigate('MatchStats', {
                matchId: statsNotifications.rejected[0].matchId,
                isHomeGame: true,
              });
            }}
          >
            <View style={[styles.notificationIcon, { backgroundColor: `${theme.colors.error}20` }]}>
              <Ionicons name="close-circle-outline" size={20} color={theme.colors.error} />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>
                Stats Rejected
              </Text>
              <Text style={styles.notificationMessage}>
                {rejectedCount} stat submission{rejectedCount !== 1 ? 's were' : ' was'} rejected and need{rejectedCount === 1 ? 's' : ''} revision
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.greeting}>
              Hi, {user?.name?.split(' ')[0] || 'Player'}!
            </Text>
            <TouchableOpacity 
              style={styles.avatar}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.teamName}>{user?.teamId ? 'Team XYZ' : 'No Team'}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {renderInvitations()}

            <View style={styles.statsRow}>
              <PlayerAttendanceCard 
                attendanceRate={playerStats?.percentage || 0}
                present={playerStats?.attendance?.present || 0}
                total={playerStats?.attendance?.total || 0}
              />
              <PlayerPositionCard position={user?.position || 'Unknown'} />
            </View>

            {renderStatsNotifications()}

            {/* Player Notifications */}
            {user?.id && (
              <NotificationsSection 
                userId={user.id}
                title="Recent Notifications"
                limit={3}
                showViewAll={true}
                onViewAll={() => navigation.navigate('Notifications')}
              />
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Team Updates</Text>
              <AnnouncementsCard />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Schedule</Text>
              {todayEvents.length > 0 ? (
                todayEvents.map(event => renderEventCard(event))
              ) : (
                <View style={styles.noEventsContainer}>
                  <Text style={styles.noEventsText}>No events today</Text>
                </View>
              )}
            </View>

            <View style={[styles.section, styles.statsSection]}>
              <Text style={styles.sectionTitle}>My Stats</Text>
              <View style={styles.statsRow}>
                <PlayerAttendanceCard 
                  attendance={playerStats?.attendance || { present: 0, total: 0 }}
                  percentage={playerStats?.percentage || 0}
                />
                <PlayerPositionCard 
                  position={user?.position}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map(event => renderEventCard(event))
              ) : (
                <View style={styles.noEventsContainer}>
                  <Text style={styles.noEventsText}>No upcoming events</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#2a305e',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  teamName: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  section: {
    padding: 20,
  },
  statsSection: {
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  scheduleItem: {
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
  },
  scheduleText: {
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: 6,
  },
  noEventsContainer: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  noEventsText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    marginTop: 12,
  },
  invitationItem: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invitationInfo: {
    flex: 1,
  },
  invitationText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    marginBottom: 4,
  },
  invitationDetails: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginVertical: 4,
  },
  invitationDate: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  invitationButtons: {
    gap: 8,
  },
  button: {
    borderRadius: 12,
    padding: 12,
    width: 100,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  declineButton: {
    backgroundColor: '#2a305e',
    borderWidth: 1,
    borderColor: '#e17777',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButtonText: {
    color: '#e17777',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    paddingHorizontal: 0,
  },
  statsNotificationsSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  notificationItemMargin: {
    marginTop: theme.spacing.sm,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
}); 