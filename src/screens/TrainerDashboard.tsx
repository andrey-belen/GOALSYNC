import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { 
  getTeamMembers, 
  getTeamEvents, 
  auth, 
  getUser, 
  getEventAttendanceStatus, 
  getTeamAttendanceStats,
  getPendingMatchStats,
  getPendingPlayerStats
} from '../config/firebase';
import { Event, TeamMember } from '../types/database';
import { startOfDay, endOfDay } from '../utils/dateUtils';
import { theme } from '../theme';
import { AnnouncementsCard } from '../components/AnnouncementsCard';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

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

export const TrainerDashboard = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [injuredPlayersInMatches, setInjuredPlayersInMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, boolean>>({});
  const [loadingAttendance, setLoadingAttendance] = useState<Record<string, boolean>>({});
  const [attendanceStats, setAttendanceStats] = useState<{
    totalEvents: number;
    teamAverage: number;
    playerStats: Array<{
      id: string;
      name: string;
      number?: string;
      position?: string;
      attendance: { present: number; total: number };
      percentage: number;
    }>;
  } | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [pendingMatchStats, setPendingMatchStats] = useState<Event[]>([]);
  const [pendingPlayerStats, setPendingPlayerStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadTeamData = useCallback(async () => {
    try {
      if (!user?.teamId) return;
      
      // Get all team members
      const members = await getTeamMembers(user.teamId);
      const injuredMembers = members.filter(member => member.status === 'injured');
      
      // Get upcoming matches
      const events = await getTeamEvents(user.teamId);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Filter matches within next 7 days
      const matches = events.filter(event => {
        if (event.type !== 'match') return false;
        const matchDate = event.startTime.toDate();
        return matchDate >= now && matchDate <= sevenDaysFromNow;
      });
      
      // Find injured players who are assigned to matches
      const injuredInMatches = matches.reduce((acc, match) => {
        const injuredInThisMatch = match.roster?.filter(player => 
          injuredMembers.some(injured => injured.id === player.id)
        ) || [];
        
        return [...acc, ...injuredInThisMatch.map(player => {
          const matchDate = match.startTime.toDate();
          const daysUntilMatch = Math.ceil((matchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            ...player,
            matchTitle: match.title,
            matchDate: match.startTime,
            matchId: match.id,
            daysUntilMatch
          };
        })];
      }, [] as any[]);

      // Remove duplicates and sort by closest match
      const uniqueInjuredPlayers = Array.from(
        new Set(injuredInMatches.map(p => p.id))
      ).map(id => 
        injuredInMatches
          .filter(p => p.id === id)
          .sort((a, b) => a.daysUntilMatch - b.daysUntilMatch)[0]
      );

      setInjuredPlayersInMatches(uniqueInjuredPlayers);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.teamId]);

  useFocusEffect(
    useCallback(() => {
      console.log('Dashboard focused - loading match statistics data');
      loadTeamData();
      loadMatchStatsData();
    }, [])
  );

  useEffect(() => {
    loadTeamData();
    loadTodayEvents();
    loadAttendanceStats();
    loadCounts();
    loadMatchStatsData();
  }, [loadTeamData]);

  const checkAttendanceStatus = async (eventId: string) => {
    try {
      setLoadingAttendance(prev => ({ ...prev, [eventId]: true }));
      const status = await getEventAttendanceStatus(eventId);
      setAttendanceStatus(prev => ({ ...prev, [eventId]: status }));
    } catch (error) {
      console.error('Error checking attendance status:', error);
    } finally {
      setLoadingAttendance(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const loadTodayEvents = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userData = await getUser(currentUser.uid);
      if (!userData?.teamId) return;

      const start = startOfDay(new Date());
      const end = endOfDay(new Date());
      const events = await getTeamEvents(userData.teamId, start, end);
      setTodayEvents(events);
      
      // Check attendance status for each event
      events.forEach(event => {
        checkAttendanceStatus(event.id);
      });
    } catch (error) {
      console.error('Error loading today\'s events:', error);
    }
  };

  const loadAttendanceStats = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userData = await getUser(currentUser.uid);
      if (!userData?.teamId) return;

      const stats = await getTeamAttendanceStats(userData.teamId);
      setAttendanceStats(stats);
    } catch (error) {
      console.error('Error loading attendance stats:', error);
    }
  };

  const loadMatchStatsData = async () => {
    try {
      setLoadingStats(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No current user found when loading match stats');
        return;
      }

      const userData = await getUser(currentUser.uid);
      if (!userData?.teamId) {
        console.log('No team ID found for current user');
        return;
      }

      console.log('Loading pending match stats for team:', userData.teamId);
      
      // Get matches that need score submission
      const pendingMatches = await getPendingMatchStats(userData.teamId);
      console.log('Pending matches that need scores:', pendingMatches.length);
      setPendingMatchStats(pendingMatches);

      // Get player stats that need approval
      const pendingStats = await getPendingPlayerStats(userData.teamId);
      console.log('Pending player stats that need approval:', pendingStats.length);
      setPendingPlayerStats(pendingStats);
      
      console.log('Match stats data loaded successfully');
    } catch (error) {
      console.error('Error loading match stats data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadCounts = async () => {
    try {
      if (!user?.teamId) return;
      
      // Get team members count
      const members = await getTeamMembers(user.teamId);
      setPlayerCount(members.filter(m => m.role === 'player').length);
      
      // Get total events count
      const events = await getTeamEvents(user.teamId);
      setEventCount(events.length);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const renderInjuredPlayersWarning = () => {
    if (injuredPlayersInMatches.length === 0) return null;
    
    return (
      <View style={styles.warningSection}>
        <View style={styles.warningContent}>
          <Ionicons name="medical" size={24} color="#ff4444" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Injured Players in Upcoming Matches</Text>
            <Text style={styles.warningText}>
              {injuredPlayersInMatches.length} player{injuredPlayersInMatches.length !== 1 ? 's' : ''} marked as injured {injuredPlayersInMatches.length !== 1 ? 'are' : 'is'} scheduled to play in upcoming matches
            </Text>
            {injuredPlayersInMatches.map(player => (
              <Text key={player.id} style={styles.warningMatchText}>
                • {player.name} - {player.matchTitle} ({player.daysUntilMatch} day{player.daysUntilMatch !== 1 ? 's' : ''} away)
              </Text>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderMatchStatsNotifications = () => {
    const hasPendingMatchStats = pendingMatchStats.length > 0;
    const hasPendingPlayerStats = pendingPlayerStats.length > 0;
    
    if (!hasPendingMatchStats && !hasPendingPlayerStats) return null;
    
    return (
      <View style={styles.warningSection}>
        <View style={styles.warningContent}>
          <Ionicons name="stats-chart" size={24} color="#ff4444" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Match Statistics</Text>
            
            {hasPendingMatchStats && (
              <TouchableOpacity 
                onPress={() => {
                  if (pendingMatchStats.length > 0) {
                    navigation.navigate('UploadMatchStats', { 
                      matchId: pendingMatchStats[0].id,
                    });
                  }
                }}
              >
                <Text style={styles.warningText}>
                  {pendingMatchStats.length} match{pendingMatchStats.length !== 1 ? 'es' : ''} need{pendingMatchStats.length === 1 ? 's' : ''} final score submission
                </Text>
              </TouchableOpacity>
            )}
            
            {hasPendingPlayerStats && (
              <TouchableOpacity 
                onPress={() => {
                  if (pendingPlayerStats.length > 0) {
                    navigation.navigate('MatchStats', { 
                      matchId: pendingPlayerStats[0].matchId,
                      isHomeGame: true,
                    });
                  }
                }}
              >
                <Text style={styles.warningText}>
                  {pendingPlayerStats.length} player stat{pendingPlayerStats.length !== 1 ? 's' : ''} pending approval
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.scrollView}>
        <View style={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.greeting}>Hi, Coach {user?.name?.split(' ')[0]}!</Text>
              <TouchableOpacity 
                style={styles.avatar}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.nextMatch}>Next match: Saturday 10:30AM</Text>
          </View>

          {renderInjuredPlayersWarning()}
          
          {renderMatchStatsNotifications()}

          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Announcement')}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.actionText}>New Announcement</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Schedule')}
            >
              <Ionicons name="calendar" size={24} color="#fff" />
              <Text style={styles.actionText}>Schedule Event</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('FormationSetup', {
                formation: '4-4-2',
                players: [],
                onComplete: () => {}
              })}
            >
              <Ionicons name="football" size={24} color="#fff" />
              <Text style={styles.actionText}>Set Formation</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Stats</Text>
            <View style={styles.statsGrid}>
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigation.navigate('Team', {})}
              >
                <Text style={styles.statNumber}>{playerCount}</Text>
                <Text style={styles.statLabel}>Players</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigation.navigate('AttendanceDetails')}
              >
                <Text style={styles.statNumber}>{attendanceStats?.teamAverage || 0}%</Text>
                <Text style={styles.statLabel}>Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Calendar' })}
              >
                <Text style={styles.statNumber}>{eventCount}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(pendingMatchStats.length > 0 || pendingPlayerStats.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Pending Match Stats
                {loadingStats && <ActivityIndicator size="small" color={theme.colors.primary} style={{marginLeft: 10}} />}
              </Text>
              
              {pendingMatchStats.length > 0 && (
                <TouchableOpacity 
                  style={styles.pendingStatsItem}
                  onPress={() => {
                    navigation.navigate('UploadMatchStats', { 
                      matchId: pendingMatchStats[0].id,
                    });
                  }}
                >
                  <View style={styles.pendingStatsIconContainer}>
                    <Ionicons name="trophy-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.pendingStatsContent}>
                    <Text style={styles.pendingStatsTitle}>Score submission needed</Text>
                    <Text style={styles.pendingStatsSubtitle}>
                      {pendingMatchStats[0].title || 'Match'} - {pendingMatchStats.length} total
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              )}
              
              {pendingPlayerStats.length > 0 && (
                <TouchableOpacity 
                  style={[styles.pendingStatsItem, pendingMatchStats.length > 0 && styles.pendingStatsItemMargin]}
                  onPress={() => {
                    navigation.navigate('MatchStats', { 
                      matchId: pendingPlayerStats[0].matchId,
                      isHomeGame: true,
                    });
                  }}
                >
                  <View style={styles.pendingStatsIconContainer}>
                    <Ionicons name="clipboard-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.pendingStatsContent}>
                    <Text style={styles.pendingStatsTitle}>Player stats approval needed</Text>
                    <Text style={styles.pendingStatsSubtitle}>
                      {pendingPlayerStats[0].playerName || 'Player'} - {pendingPlayerStats.length} total
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              {todayEvents.length > 3 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'Calendar' })}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {todayEvents.length > 0 ? (
              <>
                {todayEvents.slice(0, 3).map(event => (
                  <TouchableOpacity 
                    key={event.id}
                    style={styles.scheduleItem}
                    onPress={() => navigation.navigate('Attendance', {
                      eventId: event.id,
                      eventType: event.type,
                      title: event.title,
                      date: event.startTime.toDate(),
                      time: event.startTime.toDate(),
                      location: event.location,
                      notes: event.description
                    })}
                  >
                    <View style={styles.eventTypeIndicator}>
                      <Ionicons name={getEventIcon(event.type)} size={16} color={getEventColor(event.type)} />
                    </View>
                    <View style={styles.scheduleItemContent}>
                      <View style={styles.scheduleItemMain}>
                        <Text style={styles.scheduleText}>{event.title}</Text>
                        <Text style={styles.scheduleTime}>
                          {event.startTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <View style={styles.scheduleItemFooter}>
                        <Text style={styles.eventTypeText}>
                          {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                        </Text>
                        <TouchableOpacity 
                          style={[
                            styles.markAttendanceButton,
                            attendanceStatus[event.id] && styles.attendanceMarkedButton
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
                          {loadingAttendance[event.id] ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons 
                                name={attendanceStatus[event.id] ? "checkmark-circle" : "checkbox-outline"} 
                                size={14} 
                                color="#fff" 
                              />
                              <Text style={styles.markAttendanceText}>
                                {attendanceStatus[event.id] ? 'View' : 'Mark'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {todayEvents.length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewMoreButton}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Calendar' })}
                  >
                    <Text style={styles.viewMoreText}>
                      +{todayEvents.length - 3} more events today
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Text style={styles.noEventsText}>No events scheduled for today</Text>
            )}
          </View>

          <View style={styles.announcementsContainer}>
            <AnnouncementsCard />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity 
              style={styles.activityItem}
              onPress={() => navigation.navigate('Team', {})}
            >
              <Text style={styles.activityText}>John D. confirmed attendance</Text>
              <Text style={styles.activityTime}>5m ago</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.activityItem}
              onPress={() => navigation.navigate('Chat', { teamId: user?.teamId || 'default' })}
            >
              <Text style={styles.activityText}>New message from Mike S.</Text>
              <Text style={styles.activityTime}>15m ago</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1f3d',
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1f3d',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  header: {
    marginBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e17777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextMatch: {
    color: '#e17777',
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#2a305e',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    flex: 0.3,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#2a305e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#e17777',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 48, 94, 0.5)',
    borderRadius: 8,
    marginBottom: 8,
    padding: 10,
    gap: 12,
  },
  eventTypeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleItemContent: {
    flex: 1,
  },
  scheduleItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduleItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  scheduleTime: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  eventTypeText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  markAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  markAttendanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  activityText: {
    color: '#fff',
    fontSize: 16,
  },
  activityTime: {
    color: '#666',
    fontSize: 14,
  },
  warningSection: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  warningText: {
    color: '#ff4444',
    fontSize: 14,
    marginBottom: 8,
  },
  warningMatchText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 8,
    marginBottom: 2,
  },
  noEventsText: {
    color: theme.colors.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
  attendanceMarkedButton: {
    backgroundColor: theme.colors.success,
  },
  attendanceOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#2a305e',
    borderRadius: 12,
    marginBottom: 20,
  },
  attendanceStatBox: {
    alignItems: 'center',
  },
  attendanceStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  attendanceStatLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  playerStatsContainer: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
  },
  playerStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerStatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playerNumberText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerStatName: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  playerStatPosition: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  playerStatNumbers: {
    alignItems: 'flex-end',
  },
  playerStatPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  playerStatAttendance: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  cardSubtext: {
    color: theme.colors.primary,
    fontSize: 14,
    marginTop: 8,
  },
  announcementsContainer: {
    marginBottom: 20,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  viewMoreButton: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewMoreText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  matchStatsSection: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  matchStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchStatsTextContainer: {
    flex: 1,
  },
  matchStatsTitle: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  matchStatsNotification: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 8,
  },
  matchStatsText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
  },
  pendingStatsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(225, 119, 119, 0.3)',
    borderRadius: 8,
  },
  pendingStatsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(225, 119, 119, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pendingStatsContent: {
    flex: 1,
  },
  pendingStatsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pendingStatsSubtitle: {
    color: '#fff',
    fontSize: 14,
  },
  pendingStatsItemMargin: {
    marginTop: 12,
  },
});