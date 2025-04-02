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
import { getTeamAnnouncements, markAnnouncementAsRead } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Announcement } from '../types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const AnnouncementsCard = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, [user?.teamId]);

  const loadAnnouncements = async () => {
    try {
      if (!user?.teamId) return;
      const fetchedAnnouncements = await getTeamAnnouncements(user.teamId);
      setAnnouncements(fetchedAnnouncements.slice(0, 3) as Announcement[]); // Show only 3 most recent
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnouncementPress = async (announcement: Announcement) => {
    try {
      if (!user?.id) return;
      
      // Navigate to announcement details
      navigation.navigate('AnnouncementDetails', { announcement });
      
      // Mark as read if unread
      if (!announcement.readBy?.includes(user.id)) {
        await markAnnouncementAsRead(announcement.id, user.id);
        loadAnnouncements();
      }
    } catch (error) {
      console.error('Error handling announcement press:', error);
    }
  };

  const isUnread = (announcement: Announcement) => {
    return !announcement.readBy?.includes(user?.id || '');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Announcements</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (announcements.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Announcements</Text>
          {user?.type === 'trainer' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Announcement')}
              style={styles.addButton}
            >
              <Ionicons name="add" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.emptyText}>No announcements yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Announcements</Text>
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
            onPress={() => navigation.navigate('AllAnnouncements')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {announcements.map((announcement) => (
        <TouchableOpacity
          key={announcement.id}
          style={[
            styles.announcementItem,
            isUnread(announcement) && styles.unreadItem,
            announcement.priority === 'high' && styles.highPriorityItem,
          ]}
          onPress={() => handleAnnouncementPress(announcement)}
        >
          <View style={styles.announcementHeader}>
            <View style={styles.titleContainer}>
              {announcement.priority === 'high' && (
                <Ionicons name="alert-circle" size={16} color={theme.colors.primary} />
              )}
              <Text style={styles.announcementTitle} numberOfLines={1}>
                {announcement.title}
              </Text>
            </View>
            {isUnread(announcement) && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.timestamp}>
            {format(announcement.createdAt.toDate(), 'MMM d, h:mm a')}
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
  announcementItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1a1f3d',
    marginBottom: 8,
  },
  unreadItem: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
  },
  highPriorityItem: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
  },
  announcementHeader: {
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
  announcementTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    flex: 1,
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
}); 