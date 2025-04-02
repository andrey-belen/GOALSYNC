import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getTeamAttendanceStats } from '../config/firebase';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface AttendanceStats {
  totalEvents: number;
  teamAverage: number;
  playerStats: Array<{
    id: string;
    name: string;
    number?: string;
    position?: string;
    attendance: { present: number; total: number };
    percentage: number;
  }>;
}

type SortOption = 'name' | 'attendance' | 'position';
type FilterOption = 'all' | 'above90' | 'below75';

export const AttendanceDetails = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('attendance');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  useEffect(() => {
    loadStats();
  }, [user?.teamId]);

  const loadStats = async () => {
    try {
      if (user?.teamId) {
        const attendanceStats = await getTeamAttendanceStats(user.teamId);
        setStats(attendanceStats);
      }
    } catch (error) {
      console.error('Error loading attendance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (percentage: number): string => {
    if (percentage >= 90) return theme.colors.success;
    if (percentage >= 75) return '#FFC107';
    return '#FF5252';
  };

  const filterPlayers = (players: AttendanceStats['playerStats']) => {
    switch (filterBy) {
      case 'above90':
        return players.filter(p => p.percentage >= 90);
      case 'below75':
        return players.filter(p => p.percentage < 75);
      default:
        return players;
    }
  };

  const sortPlayers = (players: AttendanceStats['playerStats']) => {
    switch (sortBy) {
      case 'name':
        return [...players].sort((a, b) => a.name.localeCompare(b.name));
      case 'position':
        return [...players].sort((a, b) => (a.position || '').localeCompare(b.position || ''));
      case 'attendance':
        return [...players].sort((a, b) => b.percentage - a.percentage);
      default:
        return players;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const filteredAndSortedPlayers = stats?.playerStats ? 
    sortPlayers(filterPlayers(stats.playerStats)) : [];

  return (
    <ScrollView style={styles.container}>
      {/* Overview Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color={theme.colors.primary} />
          <Text style={styles.statLabel}>Total Events</Text>
          <Text style={styles.statValue}>{stats?.totalEvents || 0}</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color={theme.colors.primary} />
          <Text style={styles.statLabel}>Team Average</Text>
          <Text style={[
            styles.statValue,
            { color: getAttendanceColor(stats?.teamAverage || 0) }
          ]}>
            {stats?.teamAverage || 0}%
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="person" size={24} color={theme.colors.primary} />
          <Text style={styles.statLabel}>Players</Text>
          <Text style={styles.statValue}>{stats?.playerStats.length || 0}</Text>
        </View>
      </View>

      {/* Filters and Sorting */}
      <View style={styles.controlsContainer}>
        <View style={styles.filterContainer}>
          <Text style={styles.controlLabel}>Filter:</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.filterButton, filterBy === 'all' && styles.activeButton]}
              onPress={() => setFilterBy('all')}
            >
              <Text style={[styles.buttonText, filterBy === 'all' && styles.activeButtonText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, filterBy === 'above90' && styles.activeButton]}
              onPress={() => setFilterBy('above90')}
            >
              <Text style={[styles.buttonText, filterBy === 'above90' && styles.activeButtonText]}>Above 90%</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, filterBy === 'below75' && styles.activeButton]}
              onPress={() => setFilterBy('below75')}
            >
              <Text style={[styles.buttonText, filterBy === 'below75' && styles.activeButtonText]}>Below 75%</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sortContainer}>
          <Text style={styles.controlLabel}>Sort by:</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'attendance' && styles.activeButton]}
              onPress={() => setSortBy('attendance')}
            >
              <Text style={[styles.buttonText, sortBy === 'attendance' && styles.activeButtonText]}>Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'name' && styles.activeButton]}
              onPress={() => setSortBy('name')}
            >
              <Text style={[styles.buttonText, sortBy === 'name' && styles.activeButtonText]}>Name</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'position' && styles.activeButton]}
              onPress={() => setSortBy('position')}
            >
              <Text style={[styles.buttonText, sortBy === 'position' && styles.activeButtonText]}>Position</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Player List */}
      <View style={styles.playerListContainer}>
        <Text style={styles.sectionTitle}>Player Attendance</Text>
        {filteredAndSortedPlayers.map(player => (
          <View key={player.id} style={styles.playerCard}>
            <View style={styles.playerInfo}>
              <View style={styles.playerNumberContainer}>
                <Text style={styles.playerNumber}>{player.number || '-'}</Text>
              </View>
              <View>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerPosition}>{player.position || 'Unassigned'}</Text>
              </View>
            </View>
            <View style={styles.attendanceInfo}>
              <Text style={[styles.attendancePercentage, { color: getAttendanceColor(player.percentage) }]}>
                {player.percentage}%
              </Text>
              <Text style={styles.attendanceDetails}>
                {player.attendance.present}/{player.attendance.total} events
              </Text>
            </View>
          </View>
        ))}
      </View>
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
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a305e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginVertical: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: '#2a305e',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  filterContainer: {
    marginBottom: 15,
  },
  sortContainer: {
    marginTop: 10,
  },
  controlLabel: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1a1f3d',
    alignItems: 'center',
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1a1f3d',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#fff',
  },
  playerListContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a305e',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  },
  playerPosition: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  attendanceInfo: {
    alignItems: 'flex-end',
  },
  attendancePercentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  attendanceDetails: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
});

export default AttendanceDetails; 