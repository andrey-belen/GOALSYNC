import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { theme } from '../theme';
import { MatchStats, PlayerMatchStats } from '../types/database';
import { NavigationProp } from '@react-navigation/native';
import { db } from '../config/firebase';
import { EditStatsModal } from './EditStatsModal';

interface TrainerMatchStatsFormProps {
  matchId: string;
  trainerId: string;
  playerStats: PlayerMatchStats[];
  setPlayerStats: React.Dispatch<React.SetStateAction<PlayerMatchStats[]>>;
  playerNames: Record<string, string>;
  onSubmitScore: (stats: Omit<MatchStats, 'id' | 'playerStats'>) => void;
  onReviewPlayerStats: (statId: string, approved: boolean) => void;
  onDeletePlayerStats: (statId: string) => void;
  existingScore?: { home: number; away: number };
  existingPossession?: number;
  teamId: string;
  navigation: NavigationProp<any>;
}

export const TrainerMatchStatsForm: React.FC<TrainerMatchStatsFormProps> = ({
  matchId,
  trainerId,
  playerStats,
  setPlayerStats,
  playerNames,
  onSubmitScore,
  onReviewPlayerStats,
  onDeletePlayerStats,
  existingScore,
  existingPossession,
  teamId,
  navigation,
}) => {
  const [score, setScore] = useState({
    home: existingScore?.home || 0,
    away: existingScore?.away || 0,
  });
  const [possession, setPossession] = useState(existingPossession || 50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStats, setEditingStats] = useState<PlayerMatchStats | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  // Calculate total goals from approved player stats
  const approvedStats = playerStats.filter(stat => stat.status === 'approved');
  const totalPlayerGoals = approvedStats.reduce((sum, stat) => sum + stat.stats.goals, 0);

  // Validate score against player goals
  const validateScore = () => {
    if (score.home < 0 || score.away < 0) {
      Alert.alert('Invalid Score', 'Scores cannot be negative');
      return false;
    }

    if (possession < 0 || possession > 100) {
      Alert.alert('Invalid Possession', 'Possession must be between 0 and 100');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateScore()) return;

    try {
      setIsSubmitting(true);
      const stats: Omit<MatchStats, 'id' | 'playerStats'> = {
        matchId,
        score,
        possession,
        status: 'final',
        submittedBy: trainerId,
        submittedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await onSubmitScore(stats);
    } catch (error) {
      console.error('Error submitting match score:', error);
      Alert.alert('Error', 'Failed to submit match score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStats = async (updatedStats: PlayerMatchStats['stats']) => {
    if (!editingStats) return;

    try {
      // Update the stats in Firestore
      await updateDoc(doc(db, 'playerMatchStats', editingStats.id), {
        stats: updatedStats,
        updatedAt: Timestamp.now(),
      });
      
      // Update the local state to reflect changes immediately
      const updatedPlayerStats = playerStats.map(stat => 
        stat.id === editingStats.id 
          ? { ...editingStats, stats: updatedStats }  // Keep all existing data, just update stats
          : stat
      );
      setPlayerStats(updatedPlayerStats);

      // Close the modal
      setIsEditModalVisible(false);
      setEditingStats(null);

      // Show success message
      Alert.alert('Success', 'Player statistics have been updated successfully');
    } catch (error) {
      console.error('Error updating stats:', error);
      Alert.alert('Error', 'Failed to update player statistics');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Match Score</Text>
        <View style={styles.scoreCard}>
          <View style={styles.scoreInput}>
            <TextInput
              style={styles.scoreText}
              value={score.home.toString()}
              onChangeText={(text) => setScore(prev => ({ ...prev, home: parseInt(text) || 0 }))}
              keyboardType="numeric"
              editable={!isSubmitting}
            />
            <Text style={styles.scoreSeparator}>-</Text>
            <TextInput
              style={styles.scoreText}
              value={score.away.toString()}
              onChangeText={(text) => setScore(prev => ({ ...prev, away: parseInt(text) || 0 }))}
              keyboardType="numeric"
              editable={!isSubmitting}
            />
          </View>
          <Text style={styles.validationText}>
            Total Player Goals: {totalPlayerGoals}
          </Text>
          <View style={styles.possessionContainer}>
            <View style={styles.possessionContent}>
              <Text style={styles.possessionLabel}>Possession</Text>
              <View style={styles.possessionInputContainer}>
                <TextInput
                  style={styles.possessionText}
                  value={possession.toString()}
                  onChangeText={(text) => setPossession(parseInt(text) || 0)}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
                <Text style={styles.possessionPercent}>%</Text>
              </View>
            </View>
            <View style={styles.possessionBar}>
              <View style={[styles.possessionFill, { width: `${possession}%` }]} />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : 'Save Score'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Player Statistics</Text>
        <TouchableOpacity
          style={styles.addStatsButton}
          onPress={() => navigation.navigate('SubmitPlayerStats', { matchId, teamId })}
        >
          <Text style={styles.addStatsButtonText}>Submit Stats for Player</Text>
        </TouchableOpacity>

        {/* Approved Stats */}
        {playerStats.filter(stat => stat.status === 'approved').map((stat: PlayerMatchStats) => (
          <View key={stat.id} style={[styles.playerCard, styles.approvedCard]}>
            <View style={styles.playerHeader}>
              <Text style={styles.playerName}>{playerNames[stat.playerId] || 'Unknown Player'}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✓ Approved</Text>
              </View>
            </View>
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
                <Text style={styles.statValue}>{stat.stats.shotsOnTarget}</Text>
                <Text style={styles.statLabel}>Shots</Text>
              </View>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => {
                  setEditingStats(stat);
                  setIsEditModalVisible(true);
                }}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => onDeletePlayerStats(stat.id)}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Pending Stats */}
        {playerStats.filter(stat => stat.status === 'pending').map((stat: PlayerMatchStats) => (
          <View key={stat.id} style={[styles.playerCard, styles.pendingCard]}>
            <View style={styles.playerHeader}>
              <Text style={styles.playerName}>{playerNames[stat.playerId] || 'Unknown Player'}</Text>
              <View style={[styles.statusBadge, styles.pendingBadge]}>
                <Text style={[styles.statusText, styles.pendingText]}>Pending Review</Text>
              </View>
            </View>
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
                <Text style={styles.statValue}>{stat.stats.shotsOnTarget}</Text>
                <Text style={styles.statLabel}>Shots</Text>
              </View>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => {
                  setEditingStats(stat);
                  setIsEditModalVisible(true);
                }}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => onReviewPlayerStats(stat.id, true)}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => onReviewPlayerStats(stat.id, false)}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => onDeletePlayerStats(stat.id)}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Rejected Stats */}
        {playerStats.some(stat => stat.status === 'rejected') && (
          <TouchableOpacity 
            style={styles.rejectedSection}
            onPress={() => setShowRejected(!showRejected)}
          >
            <Text style={styles.rejectedSectionText}>
              See Rejected Submissions ({playerStats.filter(stat => stat.status === 'rejected').length})
            </Text>
          </TouchableOpacity>
        )}
        
        {showRejected && playerStats
          .filter(stat => stat.status === 'rejected')
          .map((stat: PlayerMatchStats) => (
            <View key={stat.id} style={[styles.playerCard, styles.rejectedCard]}>
              <View style={styles.playerHeader}>
                <Text style={[styles.playerName, styles.rejectedText]}>{playerNames[stat.playerId] || 'Unknown Player'}</Text>
                <View style={[styles.statusBadge, styles.rejectedBadge]}>
                  <Text style={[styles.statusText, styles.rejectedText]}>Rejected</Text>
                </View>
              </View>
              <View style={[styles.statsGrid, styles.rejectedContent]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, styles.rejectedText]}>{stat.stats.goals}</Text>
                  <Text style={[styles.statLabel, styles.rejectedText]}>Goals</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, styles.rejectedText]}>{stat.stats.assists}</Text>
                  <Text style={[styles.statLabel, styles.rejectedText]}>Assists</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, styles.rejectedText]}>{stat.stats.shotsOnTarget}</Text>
                  <Text style={[styles.statLabel, styles.rejectedText]}>Shots</Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => {
                    setEditingStats(stat);
                    setIsEditModalVisible(true);
                  }}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => onDeletePlayerStats(stat.id)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
      </View>

      <EditStatsModal
        visible={isEditModalVisible}
        onClose={() => {
          setIsEditModalVisible(false);
          setEditingStats(null);
        }}
        onSave={handleEditStats}
        playerName={editingStats ? playerNames[editingStats.playerId] || 'Unknown Player' : ''}
        initialStats={editingStats?.stats || {
          goals: 0,
          assists: 0,
          shotsOnTarget: 0,
          yellowCards: 0,
          redCards: 0,
          cleanSheet: false,
          minutesPlayed: 90,
          saves: 0,
          goalsConceded: 0,
        }}
        isGoalkeeper={false}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  scoreCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  scoreInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    width: 60,
    height: 60,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
  },
  scoreSeparator: {
    fontSize: 32,
    marginHorizontal: theme.spacing.md,
    color: theme.colors.text.primary,
  },
  possessionContainer: {
    width: '100%',
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  possessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  possessionLabel: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  possessionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  possessionText: {
    width: 40,
    height: 30,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
  },
  possessionPercent: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  possessionBar: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  possessionFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  validationText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text.secondary,
    fontSize: 14,
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
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: theme.colors.primary,
  },
  approveButton: {
    backgroundColor: theme.colors.success,
  },
  rejectButton: {
    backgroundColor: theme.colors.error,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.success,
  },
  pendingBadge: {
    backgroundColor: theme.colors.warning,
  },
  rejectedBadge: {
    backgroundColor: theme.colors.error,
  },
  statusText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  addStatsButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  addStatsButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  pendingText: {
    color: theme.colors.text.primary,
  },
  rejectedText: {
    color: theme.colors.text.secondary,
  },
  approvedCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  rejectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    opacity: 0.7,
  },
  rejectedSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  rejectedSectionText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  rejectedContent: {
    opacity: 0.7,
  },
} as const); 