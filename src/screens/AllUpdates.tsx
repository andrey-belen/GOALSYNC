import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  getPendingMatchStats, 
  getPendingPlayerStats,
  getTeamAnnouncements,
  deleteNotification,
  deleteMatchScoreRequirement
} from '../config/firebase';
import { NotificationCard, Notification } from '../components/NotificationCard';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { SwipeListView } from 'react-native-swipe-list-view';

// Define the different types of updates
interface BaseUpdate {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read?: boolean;
  priority: 'urgent' | 'high' | 'normal' | 'low';
}

interface ActionUpdate extends BaseUpdate {
  type: 'match_stats' | 'player_stats';
  actionRoute: string;
  actionParams: any;
}

interface NotificationUpdate extends BaseUpdate {
  type: 'notification';
  originalNotification: Notification;
}

interface AnnouncementUpdate extends BaseUpdate {
  type: 'announcement';
  announcementId: string;
}

type Update = ActionUpdate | NotificationUpdate | AnnouncementUpdate;

export const AllUpdates = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [allUpdates, setAllUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllUpdates = useCallback(async () => {
    try {
      if (!user?.id || !user?.teamId) return;

      setLoading(true);
      setError(null);

      // 1. Load notifications - handle differently for trainers vs. players
      let notificationUpdates: NotificationUpdate[] = [];
      try {
        // For trainers, get all team notifications
        if (user.type === 'trainer') {
          const notifications = await getUserNotifications(user.id);
          notificationUpdates = (notifications as Notification[]).map((notification: Notification) => ({
            id: `notification-${notification.id}`,
            type: 'notification',
            title: notification.title,
            message: notification.message,
            timestamp: notification.createdAt.toDate(),
            read: notification.read,
            priority: notification.type.includes('needed') ? 'high' : 'normal',
            originalNotification: notification
          }));
        } else {
          // For players, get only their personal notifications
          const notifications = await getUserNotifications(user.id);
          notificationUpdates = (notifications as Notification[]).map((notification: Notification) => ({
            id: `notification-${notification.id}`,
            type: 'notification',
            title: notification.title,
            message: notification.message,
            timestamp: notification.createdAt.toDate(),
            read: notification.read,
            priority: notification.type.includes('needed') ? 'high' : 'normal',
            originalNotification: notification
          }));
        }
      } catch (notificationError) {
        console.error('Error loading notifications:', notificationError);
        // Continue with other updates
      }

      // 2. Load pending match stats - only for trainers
      let matchStatsUpdates: ActionUpdate[] = [];
      if (user.type === 'trainer') {
        try {
          const pendingMatches = await getPendingMatchStats(user.teamId);
          matchStatsUpdates = pendingMatches.map(match => ({
            id: `match-stats-${match.id}`,
            type: 'match_stats',
            title: 'Score Submission Required',
            message: `${match.title || 'Match'} needs final score submission`,
            timestamp: match.startTime.toDate(),
            priority: 'urgent',
            actionRoute: 'UploadMatchStats',
            actionParams: { matchId: match.id }
          }));
        } catch (matchStatsError) {
          console.error('Error loading match stats:', matchStatsError);
          // Continue with other updates
        }
      }

      // 3. Load pending player stats - only for trainers
      let playerStatsUpdates: ActionUpdate[] = [];
      if (user.type === 'trainer') {
        try {
          const pendingPlayerStats = await getPendingPlayerStats(user.teamId);
          playerStatsUpdates = pendingPlayerStats.map(stat => ({
            id: `player-stats-${stat.id}`,
            type: 'player_stats',
            title: 'Player Stats Approval',
            message: `${stat.playerName || 'Player'} stats need your approval`,
            timestamp: new Date(stat.timestamp),
            priority: 'urgent',
            actionRoute: 'MatchStats',
            actionParams: { matchId: stat.matchId, isHomeGame: true }
          }));
        } catch (playerStatsError) {
          console.error('Error loading player stats:', playerStatsError);
          // Continue with other updates
        }
      }

      // 4. Load recent announcements - using getTeamAnnouncements which properly verifies team membership
      let announcementUpdates: AnnouncementUpdate[] = [];
      try {
        const announcements = await getTeamAnnouncements(user.teamId);
        announcementUpdates = announcements.map((announcement: any) => ({
          id: `announcement-${announcement.id}`,
          type: 'announcement',
          title: 'Team Announcement',
          message: announcement.title,
          timestamp: announcement.createdAt.toDate(),
          priority: announcement.priority === 'high' ? 'high' : 'normal',
          announcementId: announcement.id
        }));
      } catch (err) {
        console.error('Error loading announcements:', err);
        // Don't throw here, just log the error and continue with other updates
      }

      // Combine all updates and sort by timestamp (newest first)
      const combinedUpdates = [
        ...notificationUpdates,
        ...matchStatsUpdates,
        ...playerStatsUpdates,
        ...announcementUpdates
      ].sort((a, b) => {
        // First sort by priority (urgent > high > normal > low)
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // Then sort by timestamp (newest first)
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      setAllUpdates(combinedUpdates);
    } catch (err: any) {
      console.error('Error loading updates:', err);
      setError(err.message || 'Failed to load updates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.teamId, user?.type]);

  useFocusEffect(
    useCallback(() => {
      loadAllUpdates();
    }, [loadAllUpdates])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllUpdates();
  }, [loadAllUpdates]);

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setAllUpdates(prev => 
        prev.map(update => 
          update.type === 'notification' && 
          (update as NotificationUpdate).originalNotification.id === notificationId
            ? { ...update, read: true } 
            : update
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleUpdateAction = (update: Update) => {
    if (update.type === 'notification') {
      const notification = (update as NotificationUpdate).originalNotification;
      if (!notification.read) {
        handleMarkNotificationAsRead(notification.id);
      }

      // Handle navigation based on notification type
      if (notification.relatedId) {
        switch (notification.type) {
          case 'stats_approved':
          case 'stats_rejected':
          case 'stats_released':
          case 'stats_needed':
          case 'approval_needed':
            navigation.navigate('MatchStats', {
              matchId: notification.relatedId,
              isHomeGame: true,
            });
            break;
        }
      }
    } else if (update.type === 'match_stats' || update.type === 'player_stats') {
      const actionUpdate = update as ActionUpdate;
      navigation.navigate(actionUpdate.actionRoute as keyof RootStackParamList, actionUpdate.actionParams);
    } else if (update.type === 'announcement') {
      navigation.navigate('AllAnnouncements');
    }
  };

  const handleLongPress = (update: Update) => {
    const isMatchStats = update.type === 'match_stats';
    const isNotification = update.type === 'notification';
    
    if (!isMatchStats && !isNotification) return;
    
    Alert.alert(
      'Delete Update',
      `Are you sure you want to delete this ${isMatchStats ? 'match score requirement' : 'notification'}? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isMatchStats) {
                // Delete match score requirement
                const matchUpdate = update as ActionUpdate;
                const matchId = matchUpdate.actionParams.matchId;
                await deleteMatchScoreRequirement(user!.teamId!, matchId);
                
                // Update local state to remove all notifications related to this match
                setAllUpdates(prev => prev.filter(u => {
                  // Always filter out the current item
                  if (u.id === update.id) return false;
                  
                  // Also filter out any other notifications related to the same match
                  if (u.type === 'notification') {
                    const notificationUpdate = u as NotificationUpdate;
                    const notification = notificationUpdate.originalNotification;
                    if (notification.type === 'stats_needed' && notification.relatedId === matchId) {
                      return false;
                    }
                  }
                  
                  return true;
                }));
                
                // Show confirmation
                Alert.alert(
                  'Successfully Deleted',
                  'The match score requirement has been removed.',
                  [{ text: 'OK' }]
                );
              } else if (isNotification) {
                // Delete notification
                const notificationUpdate = update as NotificationUpdate;
                const notificationId = notificationUpdate.originalNotification.id;
                await deleteNotification(notificationId);
                
                // Update local state
                setAllUpdates(prev => prev.filter(u => u.id !== update.id));
              }
            } catch (err) {
              console.error('Error deleting update:', err);
              Alert.alert(
                'Error',
                'Failed to delete the update. Please try again later.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  // Helper functions for rendering updates
  const getIconName = (item: Update): any => {
    switch (item.type) {
      case 'match_stats':
        return 'trophy-outline';
      case 'player_stats':
        return 'clipboard-outline';
      case 'announcement':
        return item.priority === 'high' ? 'alert-circle' : 'megaphone-outline';
      case 'notification':
        const notificationType = (item as NotificationUpdate).originalNotification.type;
        switch (notificationType) {
          case 'stats_approved':
            return 'checkmark-circle';
          case 'stats_rejected':
            return 'close-circle';
          case 'stats_released':
            return 'lock-open';
          case 'stats_needed':
            return 'create';
          case 'approval_needed':
            return 'clipboard';
          default:
            return 'notifications';
        }
      default:
        return 'alert-circle';
    }
  };

  const getIconColor = (item: Update): string => {
    // For notifications, use specific color mapping based on notification type
    if (item.type === 'notification') {
      const notificationType = (item as NotificationUpdate).originalNotification.type;
      switch (notificationType) {
        case 'stats_approved':
          return theme.colors.success;
        case 'stats_rejected':
          return theme.colors.error;
        case 'stats_needed':
        case 'approval_needed':
          return theme.colors.warning;
        default:
          return theme.colors.primary;
      }
    }
    
    // For other updates, use priority-based coloring
    switch (item.priority) {
      case 'urgent':
        return '#ff4444'; // red for urgent
      case 'high':
      case 'normal':
        return theme.colors.primary; // primary color for both high and normal
      case 'low':
        return theme.colors.text.secondary; // secondary for low
      default:
        return theme.colors.text.secondary;
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    if (!timestamp) return '';
    
    const now = new Date();
    const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    }
  };

  const renderUpdateItem = ({ item }: { item: Update }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.updateItem,
          item.priority === 'urgent' && styles.urgentUpdateItem,
          !item.read && item.type === 'notification' && styles.unreadUpdateItem
        ]}
        onPress={() => handleUpdateAction(item)}
      >
        <View style={[styles.updateIconContainer, { backgroundColor: `${getIconColor(item)}20` }]}>
          <Ionicons name={getIconName(item)} size={24} color={getIconColor(item)} />
        </View>
        
        <View style={styles.updateContent}>
          <View style={styles.updateHeader}>
            <Text style={styles.updateTitle}>{item.title}</Text>
            <Text style={styles.updateTime}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          <Text style={styles.updateMessage}>{item.message}</Text>
          
          {item.priority === 'urgent' && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>Urgent</Text>
            </View>
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off" size={64} color={theme.colors.text.secondary} />
      <Text style={styles.emptyText}>All caught up!</Text>
      <Text style={styles.emptySubtext}>
        You don't have any pending updates. Check back later for new notifications and actions.
      </Text>
    </View>
  );

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          
          <Text style={styles.title}>Updates</Text>
        </View>
        
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading updates...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadAllUpdates}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SwipeListView
            data={allUpdates}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[
                styles.updateItem,
                item.priority === 'urgent' && styles.urgentUpdateItem,
                !item.read && item.type === 'notification' && styles.unreadUpdateItem
              ]}>
                <TouchableOpacity 
                  style={styles.updateItemContent}
                  onPress={() => handleUpdateAction(item)}
                >
                  <View style={[styles.updateIconContainer, { backgroundColor: `${getIconColor(item)}20` }]}>
                    <Ionicons name={getIconName(item)} size={24} color={getIconColor(item)} />
                  </View>
                  
                  <View style={styles.updateContent}>
                    <View style={styles.updateHeader}>
                      <Text style={styles.updateTitle}>{item.title}</Text>
                      <Text style={styles.updateTime}>{formatTimestamp(item.timestamp)}</Text>
                    </View>
                    <Text style={styles.updateMessage}>{item.message}</Text>
                    
                    {item.priority === 'urgent' && (
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityText}>Urgent</Text>
                      </View>
                    )}
                  </View>
                  
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
            )}
            renderHiddenItem={({ item }) => {
              const isDeleteable = item.type === 'match_stats' || item.type === 'notification';
              
              if (!isDeleteable) {
                return <View style={styles.hiddenItemContainer} />;
              }
              
              return (
                <View style={styles.hiddenItemContainer}>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert(
                        'Delete Update',
                        `Are you sure you want to delete this ${item.type === 'match_stats' ? 'match score requirement' : 'notification'}? This cannot be undone.`,
                        [
                          {
                            text: 'Cancel',
                            style: 'cancel'
                          },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                if (item.type === 'match_stats') {
                                  // Delete match score requirement
                                  const matchUpdate = item as ActionUpdate;
                                  const matchId = matchUpdate.actionParams.matchId;
                                  await deleteMatchScoreRequirement(user!.teamId!, matchId);
                                  
                                  // Update local state to remove all notifications related to this match
                                  setAllUpdates(prev => prev.filter(u => {
                                    // Always filter out the current item
                                    if (u.id === item.id) return false;
                                    
                                    // Also filter out any other notifications related to the same match
                                    if (u.type === 'notification') {
                                      const notificationUpdate = u as NotificationUpdate;
                                      const notification = notificationUpdate.originalNotification;
                                      if (notification.type === 'stats_needed' && notification.relatedId === matchId) {
                                        return false;
                                      }
                                    }
                                    
                                    return true;
                                  }));
                                  
                                  // Show confirmation
                                  Alert.alert(
                                    'Successfully Deleted',
                                    'The match score requirement has been removed.',
                                    [{ text: 'OK' }]
                                  );
                                } else if (item.type === 'notification') {
                                  // Delete notification
                                  const notificationUpdate = item as NotificationUpdate;
                                  const notificationId = notificationUpdate.originalNotification.id;
                                  await deleteNotification(notificationId);
                                  
                                  // Update local state
                                  setAllUpdates(prev => prev.filter(u => u.id !== item.id));
                                }
                              } catch (err) {
                                console.error('Error deleting update:', err);
                                Alert.alert(
                                  'Error',
                                  'Failed to delete the update. Please try again later.',
                                  [{ text: 'OK' }]
                                );
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={24} color="#ffffff" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            rightOpenValue={-80}
            disableRightSwipe
            closeOnRowPress={true}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  updateItem: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
  },
  updateItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  urgentUpdateItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  unreadUpdateItem: {
    backgroundColor: '#343b6e',
  },
  updateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  updateContent: {
    flex: 1,
    marginRight: 8,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  updateTime: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  updateMessage: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryText: {
    color: theme.colors.text.inverse,
    fontWeight: 'bold',
  },
  actionHint: {
    display: 'none',
  },
  actionHintText: {
    display: 'none',
  },
  hiddenItemContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'transparent',
    height: '100%',
    marginTop: 16,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
}); 