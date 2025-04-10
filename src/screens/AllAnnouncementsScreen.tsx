import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { AnnouncementList } from '../components/AnnouncementList';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Announcement } from '../types/database';

export const AllAnnouncementsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleAnnouncementPress = (announcement: Announcement) => {
    navigation.navigate('AnnouncementDetails', { announcement });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AnnouncementList 
          showActions={user?.type === 'trainer'} 
          onAnnouncementPress={handleAnnouncementPress}
        />
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