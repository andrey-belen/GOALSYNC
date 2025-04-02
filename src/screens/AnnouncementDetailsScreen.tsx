import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../theme';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'AnnouncementDetails'>;

export const AnnouncementDetailsScreen = ({ route }: Props) => {
  const { announcement } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            {announcement.priority === 'high' && (
              <View style={styles.priorityBadge}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.primary} />
                <Text style={styles.priorityText}>High Priority</Text>
              </View>
            )}
            <Text style={styles.title}>{announcement.title}</Text>
            <Text style={styles.timestamp}>
              {format(announcement.createdAt.toDate(), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
          
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{announcement.message}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
  },
  priorityText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  messageContainer: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
  },
  message: {
    fontSize: 16,
    color: theme.colors.text.primary,
    lineHeight: 24,
  },
}); 