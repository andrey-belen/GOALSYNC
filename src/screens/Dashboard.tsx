import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { PlayerDashboard } from './PlayerDashboard';
import { TrainerDashboard } from './TrainerDashboard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const Dashboard = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, loading } = useAuth();

  const renderQuickActions = () => {
    if (!user) return null;

    const actions = user.type === 'trainer' ? [
      {
        id: '1',
        title: 'Schedule Event',
        icon: 'calendar',
        onPress: () => navigation.navigate('Schedule'),
      },
      {
        id: '2',
        title: 'New Announcement',
        icon: 'megaphone',
        onPress: () => navigation.navigate('Announcement'),
      },
      {
        id: '3',
        title: 'Team Reports',
        icon: 'stats-chart',
        onPress: () => navigation.navigate('Reports'),
      },
    ] : [];

    return actions.length === 0 ? null : (
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              onPress={action.onPress}
            >
              <Ionicons name={action.icon as any} size={24} color={theme.colors.primary} />
              <Text style={styles.actionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {user.type === 'trainer' ? (
        <TrainerDashboard />
      ) : (
        <>
          {renderQuickActions()}
          <PlayerDashboard />
          <View style={styles.notificationsSection}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <Text style={styles.notificationText}>2 unread messages from Coach</Text>
          </View>
        </>
      )}
    </ScrollView>
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
    backgroundColor: theme.colors.background,
  },
  quickActionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    flex: 1,
  },
  actionText: {
    color: theme.colors.text.primary,
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  notificationsSection: {
    padding: 20,
  },
  notificationText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
}); 