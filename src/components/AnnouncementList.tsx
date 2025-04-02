import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { getTeamAnnouncements, markAnnouncementAsRead, deleteAnnouncement } from '../config/firebase';
import { format } from 'date-fns';
import { Announcement } from '../types/database';

interface AnnouncementListProps {
  onAnnouncementPress?: (announcement: Announcement) => void;
  showActions?: boolean;
}

export const AnnouncementList: React.FC<AnnouncementListProps> = ({
  onAnnouncementPress,
  showActions = false,
}) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnnouncements = async () => {
    try {
      if (!user?.teamId) return;
      const fetchedAnnouncements = await getTeamAnnouncements(user.teamId);
      setAnnouncements(fetchedAnnouncements as Announcement[]);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [user?.teamId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnnouncements();
  };

  const handleMarkAsRead = async (announcement: Announcement) => {
    try {
      if (!user?.id) return;
      await markAnnouncementAsRead(announcement.id, user.id);
      loadAnnouncements(); // Refresh the list
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  const handleDelete = async (announcementId: string) => {
    try {
      await deleteAnnouncement(announcementId);
      loadAnnouncements(); // Refresh the list
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const isUnread = (announcement: Announcement) => {
    return !announcement.readBy?.includes(user?.id || '');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (announcements.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.emptyText}>No announcements yet</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {announcements.map((announcement) => (
        <TouchableOpacity
          key={announcement.id}
          style={[
            styles.announcementCard,
            isUnread(announcement) && styles.unreadCard,
            announcement.priority === 'high' && styles.highPriorityCard,
          ]}
          onPress={() => {
            if (onAnnouncementPress) {
              onAnnouncementPress(announcement);
            }
            if (isUnread(announcement)) {
              handleMarkAsRead(announcement);
            }
          }}
        >
          <View style={styles.announcementHeader}>
            <View style={styles.titleContainer}>
              {announcement.priority === 'high' && (
                <Ionicons name="alert-circle" size={20} color={theme.colors.primary} />
              )}
              <Text style={styles.title}>{announcement.title}</Text>
            </View>
            {isUnread(announcement) && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.message} numberOfLines={2}>
            {announcement.message}
          </Text>
          
          <View style={styles.footer}>
            <Text style={styles.timestamp}>
              {format(announcement.createdAt.toDate(), 'MMM d, h:mm a')}
            </Text>
            
            {showActions && user?.type === 'trainer' && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(announcement.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF5252" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  announcementCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  highPriorityCard: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  message: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  deleteButton: {
    padding: 4,
  },
}); 