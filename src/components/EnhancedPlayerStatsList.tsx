import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { PlayerMatchStats } from '../types/database';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface EnhancedPlayerStatsListProps {
  playerStats: PlayerMatchStats[];
  playerNames: Record<string, string>;
}

export const EnhancedPlayerStatsList: React.FC<EnhancedPlayerStatsListProps> = ({
  playerStats,
  playerNames,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'goals' | 'assists' | 'shots' | 'minutes'>('all');
  
  // Only use approved stats
  const approvedStats = playerStats.filter(stat => stat.status === 'approved');
  
  if (approvedStats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="stats-chart-outline" size={64} color={theme.colors.text.secondary} />
        <Text style={styles.emptyText}>No approved player statistics available yet.</Text>
      </View>
    );
  }

  // Sort players by different metrics based on selected category
  const getSortedStats = () => {
    switch (selectedCategory) {
      case 'goals':
        return [...approvedStats].sort((a, b) => b.stats.goals - a.stats.goals);
      case 'assists':
        return [...approvedStats].sort((a, b) => b.stats.assists - a.stats.assists);
      case 'shots':
        return [...approvedStats].sort((a, b) => b.stats.shotsOnTarget - a.stats.shotsOnTarget);
      case 'minutes':
        return [...approvedStats].sort((a, b) => (b.stats.minutesPlayed || 0) - (a.stats.minutesPlayed || 0));
      default:
        return [...approvedStats].sort((a, b) => 
          (b.stats.goals + b.stats.assists) - (a.stats.goals + a.stats.assists)
        );
    }
  };

  const sortedStats = getSortedStats();
  
  // Calculate team totals
  const totalGoals = approvedStats.reduce((sum, stat) => sum + stat.stats.goals, 0);
  const totalAssists = approvedStats.reduce((sum, stat) => sum + stat.stats.assists, 0);
  const totalShots = approvedStats.reduce((sum, stat) => sum + stat.stats.shotsOnTarget, 0);
  const totalYellowCards = approvedStats.reduce((sum, stat) => sum + stat.stats.yellowCards, 0);
  const totalRedCards = approvedStats.reduce((sum, stat) => sum + stat.stats.redCards, 0);
  const avgMinutesPlayed = approvedStats.length > 0 
    ? Math.round(approvedStats.reduce((sum, stat) => sum + (stat.stats.minutesPlayed || 0), 0) / approvedStats.length) 
    : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Player Statistics</Text>
      
      {/* Category Selector */}
      <View style={styles.categorySelector}>
        <TouchableOpacity 
          style={[styles.categoryButton, selectedCategory === 'all' && styles.selectedCategory]} 
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.categoryText, selectedCategory === 'all' && styles.selectedCategoryText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.categoryButton, selectedCategory === 'goals' && styles.selectedCategory]} 
          onPress={() => setSelectedCategory('goals')}
        >
          <Text style={[styles.categoryText, selectedCategory === 'goals' && styles.selectedCategoryText]}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.categoryButton, selectedCategory === 'assists' && styles.selectedCategory]} 
          onPress={() => setSelectedCategory('assists')}
        >
          <Text style={[styles.categoryText, selectedCategory === 'assists' && styles.selectedCategoryText]}>Assists</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.categoryButton, selectedCategory === 'shots' && styles.selectedCategory]} 
          onPress={() => setSelectedCategory('shots')}
        >
          <Text style={[styles.categoryText, selectedCategory === 'shots' && styles.selectedCategoryText]}>Shots</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.categoryButton, selectedCategory === 'minutes' && styles.selectedCategory]} 
          onPress={() => setSelectedCategory('minutes')}
        >
          <Text style={[styles.categoryText, selectedCategory === 'minutes' && styles.selectedCategoryText]}>Minutes</Text>
        </TouchableOpacity>
      </View>
      
      {/* Team Summary */}
      <View style={styles.teamSummary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalGoals}</Text>
          <Text style={styles.summaryLabel}>Goals</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalAssists}</Text>
          <Text style={styles.summaryLabel}>Assists</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalShots}</Text>
          <Text style={styles.summaryLabel}>Shots</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{avgMinutesPlayed}</Text>
          <Text style={styles.summaryLabel}>Avg. Min</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalYellowCards}/{totalRedCards}</Text>
          <Text style={styles.summaryLabel}>Cards</Text>
        </View>
      </View>
      
      {/* Player Stats List */}
      <View style={styles.playerList}>
        {sortedStats.map((stat, index) => {
          // Calculate contribution percentage
          const goalsContributionPercentage = totalGoals > 0 
            ? Math.round((stat.stats.goals / totalGoals) * 100) 
            : 0;
            
          // For minutes, show percentage of full match (90 minutes is standard)
          const minutesPercentage = Math.round(((stat.stats.minutesPlayed || 0) / 90) * 100);
            
          return (
            <View key={stat.id} style={styles.playerCard}>
              <View style={styles.playerRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{playerNames[stat.playerId] || 'Unknown Player'}</Text>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Ionicons name="football-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.statValue}>{stat.stats.goals}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Ionicons name="share-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.statValue}>{stat.stats.assists}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Ionicons name="disc-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.statValue}>{stat.stats.shotsOnTarget}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.statValue}>{stat.stats.minutesPlayed || 0}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={styles.cardsContainer}>
                      {stat.stats.yellowCards > 0 && (
                        <View style={styles.yellowCard}>
                          <Text style={styles.cardText}>{stat.stats.yellowCards}</Text>
                        </View>
                      )}
                      {stat.stats.redCards > 0 && (
                        <View style={styles.redCard}>
                          <Text style={styles.cardText}>{stat.stats.redCards}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                {/* Contribution bar for goals */}
                {selectedCategory === 'goals' && goalsContributionPercentage > 0 && (
                  <View style={styles.contributionContainer}>
                    <View style={styles.contributionBar}>
                      <View 
                        style={[
                          styles.contributionFill, 
                          { width: `${goalsContributionPercentage}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.contributionText}>{goalsContributionPercentage}% of goals</Text>
                  </View>
                )}
                
                {/* Minutes played as percentage of full match */}
                {selectedCategory === 'minutes' && minutesPercentage > 0 && (
                  <View style={styles.contributionContainer}>
                    <View style={styles.contributionBar}>
                      <View 
                        style={[
                          styles.contributionFill, 
                          { width: `${minutesPercentage}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.contributionText}>{minutesPercentage}% of full match</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  emptyContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  categorySelector: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 2,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm - 2,
  },
  selectedCategory: {
    backgroundColor: theme.colors.primary,
  },
  categoryText: {
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: theme.colors.text.inverse,
    fontWeight: 'bold',
  },
  teamSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    color: theme.colors.text.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  playerList: {
    gap: theme.spacing.md,
  },
  playerCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  playerRank: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary + '20',
  },
  rankText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
    padding: theme.spacing.md,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  yellowCard: {
    width: 14,
    height: 18,
    backgroundColor: theme.colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  redCard: {
    width: 14,
    height: 18,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  cardText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contributionContainer: {
    marginTop: theme.spacing.sm,
  },
  contributionBar: {
    height: 6,
    backgroundColor: theme.colors.disabled,
    borderRadius: 3,
    overflow: 'hidden',
  },
  contributionFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  contributionText: {
    color: theme.colors.text.secondary,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'right',
  },
}); 