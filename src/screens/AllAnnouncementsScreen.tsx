import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { AnnouncementList } from '../components/AnnouncementList';

export const AllAnnouncementsScreen = () => {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AnnouncementList showActions={user?.type === 'trainer'} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
}); 