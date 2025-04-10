import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { getTeamAnnouncements, markAnnouncementAsRead, getUserNotifications, markNotificationAsRead } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Announcement } from '../types/database';
import { Notification } from './NotificationCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type CombinedUpdate = {
  id: string;
  type: 'announcement' | 'notification';
  title: string;
  message?: string;
  createdAt: Date;
  read: boolean;
  priority?: 'high' | 'normal';
  originalItem: any;
};

interface TeamUpdatesCardProps {
  hideTitle?: boolean;
}

export const TeamUpdatesCard = ({ hideTitle = false }: TeamUpdatesCardProps) => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [updates, setUpdates] = useState<CombinedUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUpdates();
  }, [user?.teamId, user?.id]);

  const loadUpdates = async () => {
    try {
      if (!user?.teamId || !user?.id) {
        setError("You need to be logged in and part of a team to view updates");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      
      console.log('Loading updates for user:', {
        userId: user.id,
        teamId: user.teamId,
        userType: user.type,
        isTrainer: user.type === 'trainer'
      });

      // Track whether we have at least one successful data fetch
      let hasAnySuccessfulData = false;

      // Load announcements
      let announcementUpdates: CombinedUpdate[] = [];
      let announcementError = null;
      try {
        console.log('Fetching announcements for team:', user.teamId);
        const fetchedAnnouncements = await getTeamAnnouncements(user.teamId);
        console.log(`Successfully fetched ${fetchedAnnouncements?.length || 0} announcements`);
        
        if (fetchedAnnouncements && fetchedAnnouncements.length > 0) {
          hasAnySuccessfulData = true;
          announcementUpdates = fetchedAnnouncements.map((announcement: any) => ({
            id: `announcement-${announcement.id}`,
            type: 'announcement' as const,
            title: announcement.title,
            message: announcement.message,
            createdAt: announcement.createdAt.toDate(),
            read: announcement.readBy?.includes(user.id) || false,
            priority: announcement.priority,
            originalItem: announcement
          }));
        }
      } catch (error: any) {
        console.error('Error loading announcements:', error);
        announcementError = error.message || "Error loading announcements";
      }

      // Load notifications
      let notificationUpdates: CombinedUpdate[] = [];
      let notificationError = null;
      try {
        console.log('Fetching notifications for user:', user.id);
        const fetchedNotifications = await getUserNotifications(user.id);
        console.log(`Successfully fetched ${fetchedNotifications?.length || 0} notifications`);
        
        if (fetchedNotifications && fetchedNotifications.length > 0) {
          hasAnySuccessfulData = true;
          notificationUpdates = fetchedNotifications.map((notification: any) => ({
            id: `notification-${notification.id}`,
            type: 'notification' as const,
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt.toDate(),
            read: notification.read,
            priority: notification.type.includes('needed') ? 'high' : 'normal',
            originalItem: notification
          }));
        }
      } catch (error: any) {
        console.error('Error loading notifications:', error);
        notificationError = error.message || "Error loading notifications";
      }

      // Combine and sort by date (most recent first)
      const combined = [...announcementUpdates, ...notificationUpdates]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Only set error if both fetches failed with actual errors
      if (announcementError && notificationError) {
        setError(`${announcementError}. ${notificationError}`);
      }
      
      // Show only the most recent 5
      setUpdates(combined.slice(0, 5));
    } catch (error: any) {
      console.error('Error loading updates:', error);
      setError(error.message || "An error occurred while loading updates");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePress = async (update: CombinedUpdate) => {
    try {
      if (!user?.id) return;
      
      if (update.type === 'announcement') {
        const announcement = update.originalItem;
        
        // Navigate to announcement details
        navigation.navigate('AnnouncementDetails', { announcement });
        
        // Mark as read if unread
        if (!announcement.readBy?.includes(user.id)) {
          await markAnnouncementAsRead(announcement.id, user.id);
          loadUpdates(); // Refresh the list
        }
      } else if (update.type === 'notification') {
        const notification = update.originalItem;
        
        // Mark as read if unread
        if (!notification.read) {
          await markNotificationAsRead(notification.id);
          loadUpdates(); // Refresh the list
        }

        // Navigate based on notification type
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
        } else {
          navigation.navigate('Notifications');
        }
      }
    } catch (error) {
      console.error('Error handling update press:', error);
    }
  };

  const getIconName = (update: CombinedUpdate) => {
    if (update.type === 'announcement') {
      return update.priority === 'high' ? 'alert-circle' : 'megaphone';
    } else {
      const notification = update.originalItem;
      switch (notification.type) {
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
    }
  };

  const getIconColor = (update: CombinedUpdate) => {
    if (update.type === 'announcement') {
      return theme.colors.primary;
    } else {
      const notification = update.originalItem;
      switch (notification.type) {
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
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {!hideTitle && (
          <View style={styles.header}>
            <Text style={styles.title}>Team Updates</Text>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {!hideTitle && (
          <View style={styles.header}>
            <Text style={styles.title}>Team Updates</Text>
          </View>
        )}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={theme.colors.error || '#ff4444'} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadUpdates}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (updates.length === 0) {
    return (
      <View style={styles.container}>
        {!hideTitle && (
          <View style={styles.header}>
            <Text style={styles.title}>Team Updates</Text>
            {user?.type === 'trainer' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Announcement')}
                style={styles.addButton}
              >
                <Ionicons name="add" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
        <Text style={styles.emptyText}>No updates yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!hideTitle && (
        <View style={styles.header}>
          <Text style={styles.title}>Team Updates</Text>
          <View style={styles.headerButtons}>
            {user?.type === 'trainer' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Announcement')}
                style={styles.addButton}
              >
                <Ionicons name="add" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('AllUpdates' as never)}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {updates.map((update) => (
        <TouchableOpacity
          key={update.id}
          style={[
            styles.updateItem,
            !update.read && styles.unreadItem,
          ]}
          onPress={() => handleUpdatePress(update)}
        >
          <View style={styles.updateHeader}>
            <View style={styles.titleContainer}>
              <Ionicons name={getIconName(update)} size={16} color={getIconColor(update)} />
              <Text style={styles.updateTitle} numberOfLines={1}>
                {update.title}
              </Text>
            </View>
            {!update.read && <View style={styles.unreadDot} />}
          </View>
          {update.message && (
            <Text style={styles.updateMessage} numberOfLines={1}>
              {update.message}
            </Text>
          )}
          <Text style={styles.timestamp}>
            {format(update.createdAt, 'MMM d, h:mm a')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  addButton: {
    padding: 4,
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginVertical: 20,
  },
  updateItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1a1f3d',
    marginBottom: 8,
  },
  unreadItem: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    flex: 1,
  },
  updateMessage: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.error || '#ff4444',
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
}); 