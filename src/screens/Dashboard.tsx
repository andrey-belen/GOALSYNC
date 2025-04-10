import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { PlayerDashboard } from './PlayerDashboard';
import { TrainerDashboard } from './TrainerDashboard';

export const Dashboard = () => {
  const { user, loading } = useAuth();

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
        <PlayerDashboard />
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
  }
}); 