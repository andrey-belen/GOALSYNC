import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  type: 'stats_approved' | 'stats_rejected' | 'stats_released' | 'stats_needed' | 'approval_needed';
  title: string;
  message: string;
  relatedId?: string; // matchId or statId
  teamId: string;
  createdAt: Timestamp;
  read: boolean;
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const navigation = useNavigation<any>();

  const getIconName = () => {
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
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'stats_approved':
        return theme.colors.success;
      case 'stats_rejected':
        return theme.colors.error;
      case 'stats_released':
        return theme.colors.primary;
      case 'stats_needed':
      case 'approval_needed':
        return theme.colors.warning;
      default:
        return theme.colors.text.secondary;
    }
  };

  const handlePress = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.relatedId) {
      switch (notification.type) {
        case 'stats_approved':
        case 'stats_rejected':
        case 'stats_released':
          navigation.navigate('MatchStats', {
            matchId: notification.relatedId,
            isHomeGame: true,
          });
          break;
        case 'stats_needed':
          navigation.navigate('MatchStats', {
            matchId: notification.relatedId,
            isHomeGame: true,
          });
          break;
        case 'approval_needed':
          navigation.navigate('MatchStats', {
            matchId: notification.relatedId,
            isHomeGame: true,
          });
          break;
      }
    }
  };

  const formatTimestamp = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Today - show time only
      return format(date, 'h:mm a');
    } else if (diffInHours < 48) {
      // Yesterday
      return 'Yesterday';
    } else {
      // Other days - show date
      return format(date, 'MMM d');
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        !notification.read && styles.unreadContainer
      ]}
      onPress={handlePress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}20` }]}>
        <Ionicons name={getIconName()} size={24} color={getIconColor()} />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.time}>{formatTimestamp(notification.createdAt)}</Text>
        </View>
        <Text style={styles.message}>{notification.message}</Text>
      </View>
      
      {!notification.read && (
        <View style={styles.unreadIndicator} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  unreadContainer: {
    backgroundColor: `${theme.colors.primary}10`,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    top: 16,
    right: 16,
  },
}); 