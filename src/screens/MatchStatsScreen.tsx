import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { PlayerMatchStatsForm } from '../components/PlayerMatchStatsForm';
import { TrainerMatchStatsForm } from '../components/TrainerMatchStatsForm';
import { MatchStats, PlayerMatchStats, Event } from '../types/database';
import { theme } from '../theme';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, Timestamp, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserType } from '../firebase.config';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { MatchScoreDisplay } from '../components/MatchScoreDisplay';
import { PlayerPerformanceCard } from '../components/PlayerPerformanceCard';
import { EnhancedPlayerStatsList } from '../components/EnhancedPlayerStatsList';
import { createNotification } from '../config/firebase';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchStats'>;

export const MatchStatsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { matchId, isHomeGame } = route.params;
  const { user } = useAuth();
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerMatchStats[]>([]);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [matchDetails, setMatchDetails] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMatchStats = async () => {
    try {
      setIsLoading(true);
      
      // Load match details
      const matchDoc = await getDoc(doc(db, 'events', matchId));
      if (matchDoc.exists()) {
        setMatchDetails(matchDoc.data() as Event);
      }
      
      // Load match score/possession
      const matchStatsDoc = await getDoc(doc(db, 'matchStats', matchId));
      if (matchStatsDoc.exists()) {
        console.log('Found match stats document:', matchStatsDoc.data());
        setMatchStats({ id: matchStatsDoc.id, ...matchStatsDoc.data() } as MatchStats);
      } else {
        console.log('No match stats document found for matchId:', matchId);
      }
      
      // Load player stats
      const statsQuery = query(
        collection(db, 'playerMatchStats'),
        where('matchId', '==', matchId)
      );
      const statsSnapshot = await getDocs(statsQuery);
      const stats = statsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlayerMatchStats[];
      setPlayerStats(stats);

      // Get unique player IDs from stats
      const playerIds = [...new Set(stats.map(stat => stat.playerId))];
      
      // Fetch player names if there are any stats
      if (playerIds.length > 0) {
        const playersQuery = query(
          collection(db, 'users'),
          where('id', 'in', playerIds)
        );
        const playersSnapshot = await getDocs(playersQuery);
        const playerNamesMap: Record<string, string> = {};
        playersSnapshot.docs.forEach(doc => {
          const playerData = doc.data();
          playerNamesMap[playerData.id] = playerData.name;
        });
        setPlayerNames(playerNamesMap);
      }
    } catch (error) {
      console.error('Error loading match stats:', error);
      Alert.alert('Error', 'Failed to load match statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatchStats();
  }, [matchId]);

  const handlePlayerStatsSubmit = async (stats: Omit<PlayerMatchStats, 'id' | 'status' | 'submittedAt'>) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('Submitting player stats:', stats);

      const newStats = {
        ...stats,
        status: 'pending' as const, // players always submit as pending, trainers need to approve
        submittedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'playerMatchStats'), newStats);
      
      // Add the new stats to the local state immediately
      const newStatsWithId = { id: docRef.id, ...newStats } as PlayerMatchStats;
      setPlayerStats(prev => [...prev, newStatsWithId]);
      
      // If the current user is a trainer, update playerNames to include this player if not already present
      if (user.type === 'trainer' && stats.playerId && !playerNames[stats.playerId]) {
        // Try to fetch the player's name
        try {
          const playerDoc = await getDoc(doc(db, 'users', stats.playerId));
          if (playerDoc.exists()) {
            const playerData = playerDoc.data();
            setPlayerNames(prev => ({
              ...prev,
              [stats.playerId]: playerData.name || 'Unknown Player'
            }));
          }
        } catch (error) {
          console.error('Error fetching player name:', error);
        }
      }
      
      // Also mark the match as completed in the events collection
      // This ensures it will appear in the pending stats for trainers
      const eventRef = doc(db, 'events', matchId);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists() && eventDoc.data().status !== 'completed') {
        await updateDoc(eventRef, {
          status: 'completed',
          updatedAt: serverTimestamp()
        });
        
        if (matchDetails) {
          setMatchDetails({
            ...matchDetails,
            status: 'completed'
          });
          
          // Create notifications for all players in the match roster to submit their stats
          try {
            if (matchDetails.roster && matchDetails.roster.length > 0) {
              // Send notifications to each player in the roster except the current user
              for (const player of matchDetails.roster) {
                if (player.id !== user.id) {
                  await createNotification({
                    userId: player.id,
                    type: 'stats_needed',
                    title: 'Stats Submission Needed',
                    message: `The match against ${matchDetails.opponent || 'opponent'} has been completed. Please submit your stats.`,
                    relatedId: matchId,
                    teamId: matchDetails.teamId || user.teamId || '',
                  });
                }
              }
            }
          } catch (notificationError) {
            console.error('Error creating match completion notifications:', notificationError);
            // Don't stop the flow if notification creation fails
          }
        }
      }
      
      // Create notification for trainers that stats need approval
      if (matchDetails?.teamId) {
        // Find team trainers
        const trainersQuery = query(
          collection(db, 'users'),
          where('teamId', '==', matchDetails.teamId),
          where('type', '==', 'trainer')
        );
        
        const trainersSnapshot = await getDocs(trainersQuery);
        const trainers = trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        for (const trainer of trainers) {
          await createNotification({
            userId: trainer.id,
            type: 'approval_needed',
            title: 'Stats Need Approval',
            message: `${user.name || 'A player'} has submitted match statistics for ${matchDetails.title || 'a match'}. Review and approve now.`,
            relatedId: matchId,
            teamId: matchDetails.teamId
          });
        }
      }
      
      Alert.alert(
        'Success', 
        'Your statistics have been submitted and are pending trainer approval.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting player stats:', error);
      Alert.alert('Error', 'Failed to submit statistics');
    }
  };

  const handleTrainerScoreSubmit = async (stats: Omit<MatchStats, 'id' | 'playerStats'>) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('Received stats from TrainerMatchStatsForm:', stats); // Debug log

      const matchStatsData: Omit<MatchStats, 'id'> = {
        matchId,
        score: stats.score,
        possession: stats.possession,
        status: 'final' as const,
        visibility: stats.visibility,
        allStatsComplete: stats.allStatsComplete,
        playerStats: [],
        submittedBy: user.id,
        submittedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      console.log('Preparing to save match stats:', matchStatsData); // Debug log

      // Create or update the match stats document
      const matchStatsRef = doc(db, 'matchStats', matchId);
      console.log('Using matchStats path:', `matchStats/${matchId}`); // Debug log
      
      await setDoc(matchStatsRef, matchStatsData, { merge: true });
      
      // Also mark the match as completed in the events collection
      const eventRef = doc(db, 'events', matchId);
      await updateDoc(eventRef, {
        status: 'completed',
        updatedAt: serverTimestamp()
      });
      
      console.log('Successfully called setDoc and updated match status');

      // Update local state
      setMatchStats(prev => prev ? { ...prev, ...matchStatsData } : { id: matchId, ...matchStatsData });
      if (matchDetails) {
        setMatchDetails({
          ...matchDetails,
          status: 'completed'
        });
        
        // Create notifications for all players in the match roster to submit their stats
        try {
          if (matchDetails.roster && matchDetails.roster.length > 0) {
            // Send notifications to each player in the roster
            for (const player of matchDetails.roster) {
              if (player.id !== user.id) {
                await createNotification({
                  userId: player.id,
                  type: 'stats_needed',
                  title: 'Stats Submission Needed',
                  message: `The match against ${matchDetails.opponent || 'opponent'} has been completed. Please submit your stats.`,
                  relatedId: matchId,
                  teamId: matchDetails.teamId || user.teamId || '',
                });
              }
            }
          }
        } catch (notificationError) {
          console.error('Error creating match completion notifications:', notificationError);
          // Don't stop the flow if notification creation fails
        }
      }

      // Verify the saved data
      try {
        const savedDoc = await getDoc(matchStatsRef);
        console.log('Saved document exists:', savedDoc.exists()); // Debug log
        console.log('Saved document data:', savedDoc.data()); // Debug log
      } catch (verifyError) {
        console.error('Error verifying saved data:', verifyError);
      }

      Alert.alert(
        'Success',
        'Match score has been saved successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting match score:', error);
      Alert.alert(
        'Error',
        'Failed to submit match score. Please try again.'
      );
    }
  };

  const handleApprove = async (statsId: string) => {
    try {
      const updateData = {
        status: 'approved' as const,
        reviewedBy: user?.id,
        reviewedAt: Timestamp.now(),
      };
      
      // Get the player stats before updating to get playerId
      const statsDoc = await getDoc(doc(db, 'playerMatchStats', statsId));
      const statsData = statsDoc.exists() ? statsDoc.data() : null;
      const playerId = statsData?.playerId;
      
      await updateDoc(doc(db, 'playerMatchStats', statsId), updateData);
      
      // Update local state immediately instead of reloading
      setPlayerStats(prevStats => 
        prevStats.map(stat => 
          stat.id === statsId ? { ...stat, ...updateData } : stat
        )
      );
      
      // Create notification for the player
      if (playerId && matchDetails) {
        await createNotification({
          userId: playerId,
          type: 'stats_approved',
          title: 'Stats Approved',
          message: `Your match statistics for ${matchDetails.title || 'the match'} have been approved.`,
          relatedId: matchId,
          teamId: matchDetails.teamId || ''
        });
      }
      
      // Check for auto-release of stats
      const updatedStats = playerStats.map(stat => 
        stat.id === statsId ? { ...stat, status: 'approved' as const } : stat
      );
      
      // If we have matchStats, check if all present players now have approved stats
      if (matchStats) {
        // Get event to check attendance
        const eventRef = doc(db, 'events', matchId);
        const eventDoc = await getDoc(eventRef);
        
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const attendees = eventData.attendees || [];
          
          if (attendees.length > 0) {
            // Get all the approved player IDs
            const approvedPlayerIds = updatedStats
              .filter(stat => stat.status === 'approved')
              .map(stat => stat.playerId);
            
            // Check if all present players have approved stats
            const allPresentPlayersApproved = attendees.every((playerId: string) => 
              approvedPlayerIds.includes(playerId)
            );
            
            // Check if any stats are pending or rejected
            const pendingOrRejected = updatedStats.some(
              stat => stat.status === 'pending' || stat.status === 'rejected'
            );
            
            const allComplete = !pendingOrRejected;
            
            // If all present players have stats and all stats are approved, auto-release
            if (allPresentPlayersApproved && allComplete && matchStats.visibility !== 'public') {
              // Auto-release stats
              const matchStatsRef = doc(db, 'matchStats', matchId);
              await updateDoc(matchStatsRef, {
                visibility: 'public',
                allStatsComplete: true,
                updatedAt: Timestamp.now()
              });
              
              // Update local state
              setMatchStats(prev => prev ? {
                ...prev,
                visibility: 'public',
                allStatsComplete: true,
                updatedAt: Timestamp.now()
              } : null);
              
              // Create notifications for all players that stats are released
              if (matchDetails?.teamId) {
                const playersQuery = query(
                  collection(db, 'users'),
                  where('teamId', '==', matchDetails.teamId),
                  where('type', '==', 'player')
                );
                
                const playersSnapshot = await getDocs(playersQuery);
                const players = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                for (const player of players) {
                  await createNotification({
                    userId: player.id,
                    type: 'stats_released',
                    title: 'Match Stats Released',
                    message: `Match statistics for ${matchDetails.title || 'the match'} are now available to view.`,
                    relatedId: matchId,
                    teamId: matchDetails.teamId
                  });
                }
              }
              
              // Show notification about auto-release
              setTimeout(() => {
                Alert.alert(
                  '🎉 Statistics Auto-Released 🎉',
                  'All present players now have approved statistics. Match statistics have been automatically released to all team players.',
                  [{ text: 'Great!' }]
                );
              }, 500);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error approving stats:', error);
      Alert.alert('Error', 'Failed to approve statistics');
    }
  };

  const handleReject = async (statsId: string) => {
    try {
      const updateData = {
        status: 'rejected' as const,
        reviewedBy: user?.id,
        reviewedAt: Timestamp.now(),
      };
      
      // Get the player stats before updating to get playerId
      const statsDoc = await getDoc(doc(db, 'playerMatchStats', statsId));
      const statsData = statsDoc.exists() ? statsDoc.data() : null;
      const playerId = statsData?.playerId;
      
      await updateDoc(doc(db, 'playerMatchStats', statsId), updateData);
      
      // Update local state immediately instead of reloading
      setPlayerStats(prevStats => 
        prevStats.map(stat => 
          stat.id === statsId ? { ...stat, ...updateData } : stat
        )
      );
      
      // Create notification for the player
      if (playerId && matchDetails) {
        await createNotification({
          userId: playerId,
          type: 'stats_rejected',
          title: 'Stats Rejected',
          message: `Your match statistics for ${matchDetails.title || 'the match'} have been rejected. Please review and submit again.`,
          relatedId: matchId,
          teamId: matchDetails.teamId || ''
        });
      }
    } catch (error) {
      console.error('Error rejecting stats:', error);
      Alert.alert('Error', 'Failed to reject statistics');
    }
  };

  const handleReviewPlayerStats = async (playerStatId: string, approved: boolean, comments?: string, playerId?: string) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const updateData: any = {
        status: approved ? 'approved' as const : 'rejected' as const,
        reviewedAt: Timestamp.now(),
        reviewedBy: user.id,
      };

      // Only add comments if they are provided
      if (comments) {
        updateData.comments = comments;
      }

      // Get the current player stats
      const playerStat = playerStats.find(stat => stat.id === playerStatId);
      if (!playerStat) {
        throw new Error('Player stats not found');
      }

      // Ensure we have the playerId
      const statPlayerId = playerId || playerStat.playerId;

      // Update the document in Firestore
      const docRef = doc(db, 'playerMatchStats', playerStatId);
      await updateDoc(docRef, updateData);

      // Create notification for the player
      if (statPlayerId) {
        try {
          await createNotification({
            userId: statPlayerId,
            type: approved ? 'stats_approved' : 'stats_rejected',
            title: approved ? 'Stats Approved' : 'Stats Rejected',
            message: approved 
              ? `Your statistics for the match against ${matchDetails?.opponent} have been approved.`
              : `Your statistics for the match against ${matchDetails?.opponent} have been rejected${comments ? `: ${comments}` : '.'}`,
            relatedId: matchId,
            teamId: matchDetails?.teamId || user.teamId || '',
          });
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Don't stop the flow if notification creation fails
        }
      }

      // Update local state immediately instead of full reload
      setPlayerStats(prev =>
        prev.map(stat =>
          stat.id === playerStatId
            ? {
                ...stat,
                ...updateData,
              }
            : stat
        )
      );

      // Show success message
      Alert.alert(
        'Success',
        `Statistics ${approved ? 'approved' : 'rejected'} successfully.`,
        [{ text: 'OK' }]
      );

      // If approved, check if we need to update match score
      if (approved && matchStats) {
        // Use the updated player stats for this calculation
        const updatedPlayerStats = playerStats.map(stat => 
          stat.id === playerStatId 
            ? { ...stat, status: 'approved' }
            : stat
        );
        
        const approvedStats = updatedPlayerStats.filter(stat => 
          stat.status === 'approved'
        );
        
        const totalGoals = approvedStats.reduce((sum, stat) => sum + stat.stats.goals, 0);
        const currentTotal = matchStats.score.home + matchStats.score.away;

        if (totalGoals !== currentTotal) {
          Alert.alert(
            'Score Mismatch',
            'The total goals from approved player statistics do not match the match score. Would you like to update the match score?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Update Score',
                onPress: async () => {
                  try {
                    const teamStats = approvedStats.filter(stat => 
                      stat.playerId.startsWith(matchDetails?.teamId || '')
                    );
                    const opponentStats = approvedStats.filter(stat => 
                      !stat.playerId.startsWith(matchDetails?.teamId || '')
                    );

                    const teamGoals = teamStats.reduce((sum, stat) => sum + stat.stats.goals, 0);
                    const opponentGoals = opponentStats.reduce((sum, stat) => sum + stat.stats.goals, 0);

                    const newScore = {
                      home: teamGoals,
                      away: opponentGoals,
                    };

                    // Update match stats
                    const matchStatsRef = doc(db, 'matchStats', matchId);
                    await updateDoc(matchStatsRef, {
                      score: newScore,
                      updatedAt: Timestamp.now(),
                    });

                    // Update local state immediately
                    setMatchStats(prev => prev ? { ...prev, score: newScore } : null);

                    Alert.alert('Success', 'Match score updated successfully.');
                  } catch (error) {
                    console.error('Error updating match score:', error);
                    Alert.alert('Error', 'Failed to update match score. Please try again.');
                  }
                },
              },
            ]
          );
        }
      }

    } catch (error) {
      console.error('Error reviewing player stats:', error);
      Alert.alert(
        'Error',
        'Failed to update player statistics. Please try again.'
      );
    }
  };

  const handleDeletePlayerStats = async (playerStatId: string) => {
    try {
      await deleteDoc(doc(db, 'playerMatchStats', playerStatId));
      // Update the local state to remove the deleted stat
      setPlayerStats(prevStats => prevStats.filter(stat => stat.id !== playerStatId));
    } catch (error) {
      console.error('Error deleting player stats:', error);
      Alert.alert('Error', 'Failed to delete player statistics. Please try again.');
    }
  };

  if (!user) return null;

  const userPlayerStats = playerStats.find(stat => stat.playerId === user.id);
  const isPlayerInMatch = matchDetails?.roster?.some(player => player.id === user.id);
  const matchHasEnded = matchDetails?.endTime && matchDetails.endTime.toDate() < new Date();
  
  // Check if the user is a trainer or not to determine if they can submit stats
  const isTrainer = user.type === 'trainer';
  const canSubmitPlayerSubmitStats = !isTrainer && !userPlayerStats && isPlayerInMatch && !matchHasEnded;
  const canSubmitStats = isTrainer || canSubmitPlayerSubmitStats;
  const isGoalkeeper = matchDetails?.roster?.find(player => player.id === user.id)?.position === 'GK';

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading match statistics...</Text>
      </View>
    );
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="stats-chart" size={64} color={theme.colors.text.secondary} />
      <Text style={styles.emptyTitle}>No Statistics Yet</Text>
      <Text style={styles.emptyText}>
        {!isPlayerInMatch && !isTrainer
          ? 'You are not in the roster for this match.'
          : matchHasEnded
          ? 'This match has ended. Statistics can no longer be submitted.'
          : userPlayerStats
          ? 'Your statistics are pending review.'
          : 'Submit your match statistics for this game.'}
      </Text>
    </View>
  );

  const renderMatchEndBanner = () => {
    if (!matchHasEnded || isTrainer || userPlayerStats) return null;

    return (
      <View style={styles.bannerContainer}>
        <View style={styles.bannerContent}>
          <Ionicons name="trophy-outline" size={24} color={theme.colors.text.primary} />
          <Text style={styles.bannerText}>
            Match has ended! Submit your statistics to track your performance.
          </Text>
          <TouchableOpacity 
            style={styles.bannerButton}
            onPress={() => {
              // Scroll to the stats form
              // TODO: Implement scroll to form
            }}
          >
            <Text style={styles.bannerButtonText}>Submit Stats</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {renderMatchEndBanner()}

      {/* Show score card only for players, trainers see it in their form */}
      {matchStats && !isTrainer && (
        <MatchScoreDisplay
          score={matchStats.score}
          possession={matchStats.possession}
          visibility={matchStats.visibility}
          homeTeam={matchDetails?.homeTeam}
          awayTeam={matchDetails?.awayTeam}
          matchDate={matchDetails?.startTime.toDate()}
          location={matchDetails?.location}
        />
      )}

      {/* Trainer View */}
      {isTrainer && user.teamId ? (
        <TrainerMatchStatsForm
          matchId={matchId}
          trainerId={user.id}
          playerStats={playerStats}
          setPlayerStats={setPlayerStats}
          playerNames={playerNames}
          onSubmitScore={handleTrainerScoreSubmit}
          onReviewPlayerStats={handleReviewPlayerStats}
          onDeletePlayerStats={handleDeletePlayerStats}
          existingScore={matchStats?.score}
          existingPossession={matchStats?.possession}
          teamId={user.teamId}
          navigation={navigation}
          matchStats={matchStats}
          setMatchStats={setMatchStats}
          user={user}
        />
      ) : (
        <>
          {/* Player Submission Form */}
          {!isTrainer && isPlayerInMatch && canSubmitStats && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Submit Your Statistics</Text>
              <PlayerMatchStatsForm
                matchId={matchId}
                playerId={user.id}
                onSubmit={handlePlayerStatsSubmit}
                isGoalkeeper={isGoalkeeper}
              />
            </View>
          )}

          {/* Empty State */}
          {(!matchStats && !playerStats.length) && renderEmptyState()}

          {/* Stats Not Released Message */}
          {!isTrainer && matchStats && matchStats.visibility !== 'public' && (
            <View style={styles.notReleasedContainer}>
              <Ionicons name="lock-closed" size={24} color={theme.colors.warning} />
              <Text style={styles.notReleasedText}>
                Match statistics have not been released yet.
              </Text>
            </View>
          )}
          
          {/* Player's Own Performance Card - Show before player stats list */}
          {userPlayerStats && userPlayerStats.status === 'approved' && (
            <View style={styles.performanceContainer}>
              <Text style={styles.sectionTitle}>Your Performance</Text>
              <PlayerPerformanceCard
                stats={userPlayerStats}
                isGoalkeeper={isGoalkeeper}
              />
            </View>
          )}
          
          {/* Player Stats List - Only show when released */}
          {matchStats && matchStats.visibility === 'public' && (
            <EnhancedPlayerStatsList 
              playerStats={playerStats}
              playerNames={playerNames}
            />
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    minHeight: 400,
  },
  emptyTitle: {
    color: theme.colors.text.primary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  formSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  statusSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  statusCard: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  statusApproved: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  statusRejected: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  statusText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  commentText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginTop: theme.spacing.sm,
  },
  bannerContainer: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  bannerButton: {
    backgroundColor: theme.colors.text.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  bannerButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
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
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notReleasedContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  notReleasedText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  performanceContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
}); 