import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme';
import { MatchStats, PlayerMatchStats } from '../types/database';

interface MatchStatsDisplayProps {
  matchStats: MatchStats;
  playerStats: PlayerMatchStats[];
  playerNames: Record<string, string>;
}

export const MatchStatsDisplay: React.FC<MatchStatsDisplayProps> = ({
  matchStats,
  playerStats,
  playerNames,
}) => {
  const approvedStats = playerStats.filter(stat => stat.status === 'approved');
  
  const totalGoals = approvedStats.reduce((sum, stat) => sum + stat.stats.goals, 0);
  const totalAssists = approvedStats.reduce((sum, stat) => sum + stat.stats.assists, 0);
  const totalSaves = approvedStats.reduce((sum, stat) => 
    sum + (stat.stats.isGoalkeeper ? (stat.stats.goalkeeperStats?.saves || 0) : 0), 0);
  const cleanSheets = approvedStats.filter(stat => 
    stat.stats.isGoalkeeper && stat.stats.goalkeeperStats?.cleanSheet).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scoreCard}>
        <Text style={styles.title}>Match Result</Text>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{matchStats.score.home}</Text>
          <Text style={styles.scoreText}>-</Text>
          <Text style={styles.scoreText}>{matchStats.score.away}</Text>
        </View>
        
        <View style={styles.possessionBar}>
          <View style={[styles.possessionIndicator, { width: `${matchStats.possession}%` }]} />
          <Text style={styles.possessionText}>{matchStats.possession}% Possession</Text>
        </View>
      </View>

      <View style={styles.statsOverview}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalGoals}</Text>
          <Text style={styles.statLabel}>Total Goals</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalAssists}</Text>
          <Text style={styles.statLabel}>Total Assists</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalSaves}</Text>
          <Text style={styles.statLabel}>Total Saves</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{cleanSheets}</Text>
          <Text style={styles.statLabel}>Clean Sheets</Text>
        </View>
      </View>

      <Text style={[styles.title, styles.playerStatsTitle]}>Player Statistics</Text>
      {approvedStats.map(stat => (
        <View key={stat.id} style={styles.playerCard}>
          <Text style={styles.playerName}>{playerNames[stat.playerId]}</Text>
          <View style={styles.playerStats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Goals:</Text>
              <Text style={styles.statValue}>{stat.stats.goals}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Assists:</Text>
              <Text style={styles.statValue}>{stat.stats.assists}</Text>
            </View>
            {stat.stats.isGoalkeeper && stat.stats.goalkeeperStats && (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Saves:</Text>
                  <Text style={styles.statValue}>{stat.stats.goalkeeperStats.saves}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Clean Sheet:</Text>
                  <Text style={styles.statValue}>{stat.stats.goalkeeperStats.cleanSheet ? 'Yes' : 'No'}</Text>
                </View>
              </>
            )}
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
  scoreCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginHorizontal: theme.spacing.md,
  },
  possessionBar: {
    height: 24,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  possessionIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  possessionText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: theme.colors.text.primary,
    lineHeight: 24,
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  statLabel: {
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
  },
  playerStatsTitle: {
    marginTop: theme.spacing.lg,
  },
  playerCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  playerStats: {
    marginTop: theme.spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
}); 