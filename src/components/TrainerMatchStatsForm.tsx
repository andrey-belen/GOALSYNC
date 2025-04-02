import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { theme } from '../theme';
import { MatchStats, PlayerMatchStats } from '../types/database';

interface TrainerMatchStatsFormProps {
  matchId: string;
  trainerId: string;
  playerStats: PlayerMatchStats[];
  playerNames: Record<string, string>;
  onSubmitScore: (stats: Omit<MatchStats, 'id' | 'playerStats'>) => void;
  onReviewPlayerStats: (playerStatId: string, approved: boolean, comments?: string) => void;
  existingScore?: {
    home: number;
    away: number;
  };
  existingPossession?: number;
  teamId: string;
}

export const TrainerMatchStatsForm: React.FC<TrainerMatchStatsFormProps> = ({
  matchId,
  trainerId,
  playerStats,
  playerNames,
  onSubmitScore,
  onReviewPlayerStats,
  existingScore,
  existingPossession,
  teamId,
}) => {
  const [possession, setPossession] = useState('50');
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Calculate scores from player goals
  useEffect(() => {
    const teamStats = playerStats.filter(stat => stat.playerId.startsWith(teamId));
    const opponentStats = playerStats.filter(stat => !stat.playerId.startsWith(teamId));
    
    const teamGoals = teamStats.reduce((sum, stat) => sum + stat.stats.goals, 0);
    const opponentGoals = opponentStats.reduce((sum, stat) => sum + stat.stats.goals, 0);
    
    setHomeScore(teamGoals);
    setAwayScore(opponentGoals);
  }, [playerStats, teamId]);

  const handleSubmit = () => {
    const possessionNum = parseInt(possession);
    if (isNaN(possessionNum) || possessionNum < 0 || possessionNum > 100) {
      Alert.alert('Invalid Possession', 'Please enter a number between 0 and 100');
      return;
    }

    onSubmitScore({
      matchId,
      score: { home: homeScore, away: awayScore },
      possession: possessionNum,
      submittedBy: trainerId,
      submittedAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
      status: 'final',
    });
  };

  const handleReview = async (playerStatId: string, approved: boolean) => {
    try {
      const playerStat = playerStats.find(stat => stat.id === playerStatId);
      if (!playerStat) {
        console.error('Player stat not found:', playerStatId);
        return;
      }

      const playerName = playerNames[playerStat.playerId] || 'Unknown Player';
      const action = approved ? 'approve' : 'reject';

      Alert.alert(
        `Confirm ${action}`,
        `Are you sure you want to ${action} the statistics for ${playerName}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: action === 'approve' ? 'Approve' : 'Reject',
            style: action === 'approve' ? 'default' : 'destructive',
            onPress: async () => {
              console.log(`Confirming ${action} for player:`, playerName);
              await onReviewPlayerStats(playerStatId, approved, comments[playerStatId]);
              Alert.alert(
                'Success',
                `Statistics ${action}ed successfully.`,
                [{ text: 'OK' }]
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error reviewing player stats:', error);
      Alert.alert('Error', 'Failed to review player statistics');
    }
  };

  const hasSubmittedScore = existingScore !== undefined;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Match Score</Text>
          {hasSubmittedScore && (
            <TouchableOpacity 
              onPress={() => setIsEditing(!isEditing)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {hasSubmittedScore && !isEditing ? (
          <View style={styles.scoreDisplay}>
            <Text style={styles.scoreText}>
              {homeScore} - {awayScore}
            </Text>
            <Text style={styles.possessionText}>
              Ball Possession: {existingPossession}%
            </Text>
          </View>
        ) : (
          <View style={styles.scoreInput}>
            <View style={styles.scoreRow}>
              <TextInput
                style={styles.scoreInputField}
                value={homeScore.toString()}
                onChangeText={(text) => setHomeScore(parseInt(text))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.text.secondary}
              />
              <Text style={styles.scoreSeparator}>-</Text>
              <TextInput
                style={styles.scoreInputField}
                value={awayScore.toString()}
                onChangeText={(text) => setAwayScore(parseInt(text))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.text.secondary}
              />
            </View>
            <View style={styles.possessionContainer}>
              <Text style={styles.possessionLabel}>Ball Possession (%)</Text>
              <TextInput
                style={styles.possessionInput}
                value={possession}
                onChangeText={setPossession}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {hasSubmittedScore ? 'Update Score' : 'Submit Score'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review Player Statistics</Text>
        <ScrollView style={styles.playerStatsList}>
          {playerStats.map((stat) => (
            <View key={stat.id} style={styles.playerStatCard}>
              <View style={styles.playerStatHeader}>
                <Text style={styles.playerName}>
                  {playerNames[stat.playerId] || 'Unknown Player'}
                </Text>
                <View style={[
                  styles.statusBadge,
                  stat.status === 'approved' && styles.statusApproved,
                  stat.status === 'rejected' && styles.statusRejected,
                  stat.status === 'pending' && styles.statusPending
                ]}>
                  <Text style={styles.statusText}>
                    {stat.status.charAt(0).toUpperCase() + stat.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Goals</Text>
                  <Text style={styles.statValue}>{stat.stats.goals}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Assists</Text>
                  <Text style={styles.statValue}>{stat.stats.assists}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Minutes</Text>
                  <Text style={styles.statValue}>{stat.stats.minutesPlayed}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Yellow Cards</Text>
                  <Text style={styles.statValue}>{stat.stats.yellowCards}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Red Cards</Text>
                  <Text style={styles.statValue}>{stat.stats.redCards}</Text>
                </View>
                {stat.stats.cleanSheet && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Clean Sheet</Text>
                    <Text style={styles.statValue}>Yes</Text>
                  </View>
                )}
              </View>

              {stat.status === 'pending' && (
                <View style={styles.reviewActions}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment (optional)"
                    placeholderTextColor={theme.colors.text.secondary}
                    value={comments[stat.id] || ''}
                    onChangeText={(text) => setComments(prev => ({ ...prev, [stat.id]: text }))}
                  />
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleReview(stat.id, true)}
                    >
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReview(stat.id, false)}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {stat.status !== 'pending' && stat.comments && (
                <View style={styles.commentContainer}>
                  <Text style={styles.commentLabel}>Comments:</Text>
                  <Text style={styles.commentText}>{stat.comments}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  editButton: {
    padding: theme.spacing.sm,
  },
  editButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
  },
  scoreDisplay: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  possessionText: {
    fontSize: 18,
    color: theme.colors.text.secondary,
  },
  scoreInput: {
    gap: theme.spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  scoreInputField: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    width: 60,
    textAlign: 'center',
    fontSize: 24,
    color: theme.colors.text.primary,
  },
  scoreSeparator: {
    fontSize: 24,
    color: theme.colors.text.primary,
  },
  possessionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
  },
  possessionLabel: {
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  possessionInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  submitButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerStatsList: {
    maxHeight: 400,
  },
  playerStatCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  playerStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  statusApproved: {
    backgroundColor: theme.colors.success,
  },
  statusRejected: {
    backgroundColor: theme.colors.primary,
  },
  statusPending: {
    backgroundColor: theme.colors.warning,
  },
  statusText: {
    color: theme.colors.text.primary,
    fontSize: 12,
    fontWeight: 'bold',
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
    backgroundColor: theme.colors.card,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  statLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewActions: {
    gap: theme.spacing.sm,
  },
  commentInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: theme.colors.success,
  },
  rejectButton: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonText: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
  },
  commentContainer: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.sm,
  },
  commentLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
  },
  commentText: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
}); 