import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { getTeamMembers, updateEventAttendance, auth, getUser, getDoc, doc, db } from '../config/firebase';
import { TeamMember } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Attendance'>;

export const AttendanceScreen = ({ route, navigation }: Props) => {
  const { eventId, eventType, title, date, time, location } = route.params;
  const [players, setPlayers] = useState<TeamMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, []);

  const loadAttendanceData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userData = await getUser(currentUser.uid);
      if (!userData?.teamId) return;

      // Get event data to check existing attendance
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();
      const attendees = eventData.attendees || [];
      const absentees = eventData.absentees || [];

      // Get team members
      const teamMembers = await getTeamMembers(userData.teamId);
      const playerMembers = teamMembers.filter(member => member.role === 'player') as TeamMember[];
      
      setPlayers(playerMembers);

      // Initialize attendance state based on existing data
      const initialAttendance = playerMembers.reduce((acc, player) => ({
        ...acc,
        [player.id]: attendees.includes(player.id),
      }), {});

      setAttendance(initialAttendance);
      setLoading(false);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      Alert.alert('Error', 'Failed to load attendance data');
      setLoading(false);
    }
  };

  const toggleAttendance = (playerId: string) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  const getPresentCount = () => {
    return Object.values(attendance).filter(Boolean).length;
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      // Update attendance for each player
      const updatePromises = players.map(player => 
        updateEventAttendance(eventId, player.id, attendance[player.id])
      );
      
      await Promise.all(updatePromises);

      Alert.alert(
        'Success',
        'Attendance recorded successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error submitting attendance:', error);
      Alert.alert('Error', 'Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{title}</Text>
          <View style={styles.eventDetails}>
            <View style={styles.eventDetail}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
              <Text style={styles.eventDetailText}>
                {date.toLocaleDateString()} at {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.eventDetail}>
              <Ionicons name="location-outline" size={16} color={theme.colors.text.secondary} />
              <Text style={styles.eventDetailText}>{location}</Text>
            </View>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getPresentCount()}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{players.length - getPresentCount()}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{Math.round((getPresentCount() / players.length) * 100)}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {players.map(player => (
          <TouchableOpacity
            key={player.id}
            style={styles.playerCard}
            onPress={() => toggleAttendance(player.id)}
          >
            <View style={styles.playerInfo}>
              <View style={styles.numberContainer}>
                <Text style={styles.playerNumber}>{player.number || '-'}</Text>
              </View>
              <View>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerPosition}>{player.position || 'No position'}</Text>
              </View>
            </View>
            <View style={[
              styles.statusIndicator,
              attendance[player.id] ? styles.statusPresent : styles.statusAbsent
            ]}>
              <Ionicons
                name={attendance[player.id] ? 'checkmark' : 'close'}
                size={20}
                color="#fff"
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.footerButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerButton, styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text style={styles.footerButtonText}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#2a305e',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 4,
  },
  eventInfo: {
    marginTop: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playerNumber: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerName: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  playerPosition: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPresent: {
    backgroundColor: '#4CAF50',
  },
  statusAbsent: {
    backgroundColor: '#F44336',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a305e',
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#2a305e',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
}); 