import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme';
import { Event, PlayerMatchStats } from '../types/database';

interface PlayerMatchStatsViewProps {
  match: Event;
  playerStats: PlayerMatchStats[];
  playerNames: Record<string, string>;
}

export const PlayerMatchStatsView: React.FC<PlayerMatchStatsViewProps> = ({
  match,
  playerStats,
  playerNames,
}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.matchInfo}>
        <Text style={styles.matchTitle}>
          {match.homeTeam} vs {match.awayTeam}
        </Text>
        <Text style={styles.matchDate}>
          {new Date(match.startTime.toDate()).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Player Statistics</Text>
      
      {playerStats.map((stat) => (
        <View key={stat.id} style={styles.playerStatCard}>
          <Text style={styles.playerName}>
            {playerNames[stat.playerId] || 'Unknown Player'}
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stat.stats.goals}</Text>
              <Text style={styles.statLabel}>Goals</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stat.stats.assists}</Text>
              <Text style={styles.statLabel}>Assists</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stat.stats.minutesPlayed}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stat.stats.shotsOnTarget}</Text>
              <Text style={styles.statLabel}>Shots</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stat.stats.yellowCards}</Text>
              <Text style={styles.statLabel}>Yellow</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stat.stats.redCards}</Text>
              <Text style={styles.statLabel}>Red</Text>
            </View>
            {stat.stats.saves !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stat.stats.saves}</Text>
                <Text style={styles.statLabel}>Saves</Text>
              </View>
            )}
            {stat.stats.cleanSheet !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {stat.stats.cleanSheet ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.statLabel}>Clean Sheet</Text>
              </View>
            )}
          </View>

          <View style={styles.statusContainer}>
            <Text style={[
              styles.statusText,
              stat.status === 'approved' && styles.approvedStatus,
              stat.status === 'rejected' && styles.rejectedStatus,
              stat.status === 'pending' && styles.pendingStatus,
            ]}>
              {stat.status.charAt(0).toUpperCase() + stat.status.slice(1)}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  matchInfo: {
    marginBottom: theme.spacing.lg,
  },
  matchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  matchDate: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  playerStatCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  approvedStatus: {
    color: theme.colors.success,
  },
  rejectedStatus: {
    color: theme.colors.error,
  },
  pendingStatus: {
    color: theme.colors.warning,
  },
}); 