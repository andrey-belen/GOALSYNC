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
      </View>

      <Text style={[styles.title, styles.playerStatsTitle]}>Player Statistics</Text>
      
      {approvedStats.map((stat) => (
        <View key={stat.id} style={styles.playerCard}>
          <Text style={styles.playerName}>{playerNames[stat.playerId] || 'Unknown Player'}</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statGridItem}>
              <Text style={styles.statGridValue}>{stat.stats.goals}</Text>
              <Text style={styles.statGridLabel}>Goals</Text>
            </View>
            
            <View style={styles.statGridItem}>
              <Text style={styles.statGridValue}>{stat.stats.assists}</Text>
              <Text style={styles.statGridLabel}>Assists</Text>
            </View>
            
            <View style={styles.statGridItem}>
              <Text style={styles.statGridValue}>{stat.stats.minutesPlayed}'</Text>
              <Text style={styles.statGridLabel}>Minutes</Text>
            </View>
            
            <View style={styles.statGridItem}>
              <Text style={styles.statGridValue}>{stat.stats.shotsOnTarget}</Text>
              <Text style={styles.statGridLabel}>Shots</Text>
            </View>
          </View>

          {stat.stats.saves !== undefined && (
            <View style={styles.keeperStats}>
              <Text style={styles.statLabel}>Saves: {stat.stats.saves}</Text>
              {stat.stats.cleanSheet && (
                <View style={styles.cleanSheetBadge}>
                  <Text style={styles.cleanSheetText}>Clean Sheet</Text>
                </View>
              )}
            </View>
          )}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  statGridItem: {
    width: '25%',
    padding: theme.spacing.xs,
    alignItems: 'center',
  },
  statGridValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  statGridLabel: {
    color: theme.colors.text.primary,
    fontSize: 12,
  },
  keeperStats: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cleanSheetBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  cleanSheetText: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
  },
}); 