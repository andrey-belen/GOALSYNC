import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, getDoc, setDoc } from 'firebase/firestore';
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
  onReviewPlayerStats: (statId: string, approved: boolean, playerId: string, comment?: string) => void;
  onDeletePlayerStats: (statId: string) => void;
  existingScore?: { home: number; away: number };
  existingPossession?: number;
  teamId: string;
  navigation: NavigationProp<any>;
  matchStats?: MatchStats | null;
  setMatchStats?: React.Dispatch<React.SetStateAction<MatchStats | null>>;
  user?: { name: string };
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
  matchStats,
  setMatchStats,
  user,
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
  const [isReleaseStatsLoading, setIsReleaseStatsLoading] = useState(false);

  // Validate score 
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
        visibility: 'private', // Default to private when first submitted
        allStatsComplete: checkAllStatsComplete(),
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

  // Check if all player stats are complete (reviewed and approved)
  const checkAllStatsComplete = () => {
    // If there are no player stats, they can't be complete
    if (playerStats.length === 0) return false;
    
    // Check if any stats are pending or rejected
    const pendingOrRejected = playerStats.some(
      stat => stat.status === 'pending' || stat.status === 'rejected'
    );
    
    return !pendingOrRejected;
  };

  // Check if all present players have their stats approved
  const checkAllPresentPlayersHaveStats = async (): Promise<boolean> => {
    try {
      // Get match details to access attendees list
      const eventRef = doc(db, 'events', matchId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        console.error('Event not found');
        return false;
      }

      const eventData = eventDoc.data();
      const attendees = eventData.attendees || [];
      
      // If no attendance was taken, we can't verify
      if (attendees.length === 0) {
        return false;
      }

      // Get all the approved player stats
      const approvedPlayerIds = playerStats
        .filter(stat => stat.status === 'approved')
        .map(stat => stat.playerId);
      
      // Check if all present players have approved stats
      const allPresentPlayersHaveStats = attendees.every((playerId: string) => 
        approvedPlayerIds.includes(playerId)
      );
      
      return allPresentPlayersHaveStats;
    } catch (error) {
      console.error('Error checking present players stats:', error);
      return false;
    }
  };

  // Handle releasing stats to players
  const handleReleaseStats = async () => {
    try {
      setIsReleaseStatsLoading(true);
      
      // Check if all stats are complete and approved
      const allComplete = checkAllStatsComplete();
      
      if (!allComplete) {
        Alert.alert(
          'Incomplete Stats',
          'Not all player statistics have been reviewed and approved. Please review all pending statistics before releasing.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Update the match stats document to make it publicly visible
      const matchStatsRef = doc(db, 'matchStats', matchId);
      await updateDoc(matchStatsRef, {
        visibility: 'public',
        allStatsComplete: true,
        updatedAt: Timestamp.now()
      });
      
      // Update local state to reflect the change immediately
      if (matchStats && setMatchStats) {
        setMatchStats({
          ...matchStats,
          visibility: 'public',
          allStatsComplete: true,
          updatedAt: Timestamp.now()
        });
      }
      
      Alert.alert(
        'Statistics Released',
        'Match statistics are now visible to all players.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error releasing match statistics:', error);
      Alert.alert('Error', 'Failed to release match statistics. Please try again.');
    } finally {
      setIsReleaseStatsLoading(false);
    }
  };

  // Auto-release stats when conditions are met
  const checkAndAutoReleaseStats = async (updatedStats: PlayerMatchStats[]) => {
    try {
      // Only proceed if auto-release has not occurred
      if (matchStats?.visibility === 'public') {
        return;
      }
      
      // Check if all present players have approved stats
      const allPresentPlayersHaveStats = await checkAllPresentPlayersHaveStats();
      
      // If all present players have stats and all stats are approved, auto-release
      if (allPresentPlayersHaveStats && checkAllStatsComplete()) {
        // Update the match stats document to make it publicly visible
        const matchStatsRef = doc(db, 'matchStats', matchId);
        await updateDoc(matchStatsRef, {
          visibility: 'public',
          allStatsComplete: true,
          updatedAt: Timestamp.now()
        });
        
        // Update local state to reflect the change
        if (matchStats && setMatchStats) {
          setMatchStats({
            ...matchStats,
            visibility: 'public',
            allStatsComplete: true,
            updatedAt: Timestamp.now()
          });
        }
        
        // Show a more prominent alert about the auto-release
        setTimeout(() => {
          Alert.alert(
            '🎉 Statistics Auto-Released 🎉',
            'All present players now have approved statistics. Match statistics have been automatically released to all team players.',
            [{ text: 'Great!' }]
          );
        }, 500);
      }
    } catch (error) {
      console.error('Error auto-releasing statistics:', error);
    }
  };

  const handleEditStats = async (updatedStats: PlayerMatchStats['stats']) => {
    if (!editingStats) return;

    try {
      // Update the stats in Firestore with status changed to approved if it was rejected
      const updateData: any = {
        stats: updatedStats,
        updatedAt: Timestamp.now(),
      };
      
      // If the stat was rejected, change it to approved when edited by trainer
      if (editingStats.status === 'rejected') {
        updateData.status = 'approved';
        updateData.reviewedAt = Timestamp.now();
        updateData.reviewedBy = trainerId;
      }
      
      await updateDoc(doc(db, 'playerMatchStats', editingStats.id), updateData);
      
      // Update the local state to reflect changes immediately
      const updatedPlayerStats = playerStats.map(stat => 
        stat.id === editingStats.id 
          ? { 
              ...editingStats, 
              stats: updatedStats,
              status: editingStats.status === 'rejected' ? 'approved' : editingStats.status,
              reviewedAt: editingStats.status === 'rejected' ? Timestamp.now() : editingStats.reviewedAt,
              reviewedBy: editingStats.status === 'rejected' ? trainerId : editingStats.reviewedBy,
            }
          : stat
      );
      setPlayerStats(updatedPlayerStats);

      // Close the modal
      setIsEditModalVisible(false);
      setEditingStats(null);

      // Show success message with status information
      if (editingStats.status === 'rejected') {
        Alert.alert('Success', 'Player statistics have been updated and approved successfully');
        
        // Check if we should auto-release the stats (same logic as in handleReviewPlayerStats)
        await checkAndAutoReleaseStats(updatedPlayerStats);
      } else {
        Alert.alert('Success', 'Player statistics have been updated successfully');
      }
    } catch (error) {
      console.error('Error updating stats:', error);
      Alert.alert('Error', 'Failed to update player statistics');
    }
  };

  // Modify the onReviewPlayerStats prop to include auto-release check
  const handleReviewPlayerStats = async (statId: string, approved: boolean, comment?: string) => {
    try {
      // Find the player stat to get the playerId
      const playerStat = playerStats.find(stat => stat.id === statId);
      if (!playerStat) return;
      
      // Call the parent component's review function with playerId
      await onReviewPlayerStats(statId, approved, playerStat.playerId, comment);
      
      // Update the local state to reflect the changes
      const updatedStats = playerStats.map(stat => 
        stat.id === statId 
          ? { ...stat, status: approved ? 'approved' as const : 'rejected' as const }
          : stat
      );
      
      // Check if we should auto-release the stats
      await checkAndAutoReleaseStats(updatedStats);
    } catch (error) {
      console.error('Error reviewing player stats:', error);
    }
  };

  const isStatsReleased = matchStats?.visibility === 'public';
  const allStatsComplete = checkAllStatsComplete();

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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Player Statistics</Text>
          
          {/* Stats Release Status */}
          {matchStats && (
            <View style={styles.statsStatusContainer}>
              <Text style={styles.statsStatusLabel}>Status: </Text>
              {isStatsReleased ? (
                <View style={[styles.statusBadge, styles.releasedBadge]}>
                  <Text style={styles.releasedText}>Released to Players</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.privateBadge]}>
                  <Text style={styles.privateText}>Hidden from Players</Text>
                </View>
              )}
            </View>
          )}

          {/* Release Stats Button */}
          {matchStats && !isStatsReleased && (
            <TouchableOpacity
              style={[
                styles.releaseButton,
                (!allStatsComplete || isReleaseStatsLoading) && styles.releaseButtonDisabled
              ]}
              onPress={handleReleaseStats}
              disabled={!allStatsComplete || isReleaseStatsLoading}
            >
              <Text style={styles.releaseButtonText}>
                {isReleaseStatsLoading ? 'Releasing...' : 'Release Stats to Players'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

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
        <Text style={styles.statsSectionTitle}>Pending Review</Text>
        {playerStats.filter(stat => stat.status === 'pending').map((stat: PlayerMatchStats) => (
          <View key={stat.id} style={[styles.playerCard, styles.pendingCard]}>
            <View style={styles.playerHeader}>
              <Text style={styles.playerName}>{playerNames[stat.playerId] || 'Unknown Player'}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Pending</Text>
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
            <View style={styles.reviewButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setEditingStats(stat);
                  setIsEditModalVisible(true);
                }}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleReviewPlayerStats(
                  stat.id, 
                  true, 
                  `Approved by ${user?.name || 'Trainer'}`
                )}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => {
                  Alert.prompt(
                    'Reject Statistics',
                    'Please provide a reason for rejection',
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'Reject',
                        onPress: (comment) => {
                          handleReviewPlayerStats(
                            stat.id, 
                            false, 
                            comment || `Rejected by ${user?.name || 'Trainer'}`
                          );
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
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
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  statsStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  statsStatusLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  releasedBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  releasedText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  privateBadge: {
    backgroundColor: theme.colors.warning + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  privateText: {
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: 'bold',
  },
  releaseButton: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  releaseButtonDisabled: {
    backgroundColor: theme.colors.card,
    opacity: 0.7,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  editButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  approveButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  rejectButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
} as const); 