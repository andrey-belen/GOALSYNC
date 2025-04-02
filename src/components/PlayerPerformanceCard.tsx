import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { PlayerMatchStats } from '../types/database';

interface PlayerPerformanceCardProps {
  stats: PlayerMatchStats;
  isGoalkeeper?: boolean;
}

export const PlayerPerformanceCard: React.FC<PlayerPerformanceCardProps> = ({
  stats,
  isGoalkeeper,
}) => {
  const getAchievements = () => {
    const achievements = [];
    
    if (stats.stats.goals >= 2) {
      achievements.push({ icon: 'trophy', text: 'Brace or better!' });
    }
    if (stats.stats.assists >= 2) {
      achievements.push({ icon: 'star', text: 'Multiple assists!' });
    }
    if (stats.stats.cleanSheet) {
      achievements.push({ icon: 'shield-checkmark', text: 'Clean sheet!' });
    }
    if (stats.stats.minutesPlayed >= 90) {
      achievements.push({ icon: 'time', text: 'Full match!' });
    }

    return achievements;
  };

  const achievements = getAchievements();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Highlights</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.stats.goals}</Text>
          <Text style={styles.statLabel}>Goals</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.stats.assists}</Text>
          <Text style={styles.statLabel}>Assists</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.stats.minutesPlayed}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
        {isGoalkeeper && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.stats.saves || 0}</Text>
            <Text style={styles.statLabel}>Saves</Text>
          </View>
        )}
      </View>

      {achievements.length > 0 && (
        <View style={styles.achievementsContainer}>
          <Text style={styles.achievementsTitle}>Achievements</Text>
          <View style={styles.achievementsList}>
            {achievements.map((achievement, index) => (
              <View key={index} style={styles.achievementItem}>
                <Ionicons name={achievement.icon as any} size={20} color={theme.colors.primary} />
                <Text style={styles.achievementText}>{achievement.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  achievementsContainer: {
    marginTop: theme.spacing.md,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  achievementsList: {
    gap: theme.spacing.sm,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.sm,
  },
  achievementText: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
}); 