import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { PlayerMatchStatsForm } from '../components/PlayerMatchStatsForm';
import { TrainerMatchStatsForm } from '../components/TrainerMatchStatsForm';
import { MatchStats, PlayerMatchStats, Event } from '../types/database';
import { theme } from '../theme';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db, UserType } from '../firebase.config';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { MatchScoreDisplay } from '../components/MatchScoreDisplay';
import { PlayerPerformanceCard } from '../components/PlayerPerformanceCard';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchStats'>;

export const MatchStatsScreen: React.FC<Props> = ({ route }) => {
  const { matchId, isHomeGame } = route.params;
  const { user } = useAuth();
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerMatchStats[]>([]);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [matchDetails, setMatchDetails] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch match data
        const matchDoc = await getDoc(doc(db, 'events', matchId));
        if (!matchDoc.exists()) {
          setError('Match not found');
          return;
        }
        const match = matchDoc.data() as Event;
        setMatchDetails(match);

        // Fetch match stats
        const matchStatsDoc = await getDoc(doc(db, 'matchStats', matchId));
        if (matchStatsDoc.exists()) {
          setMatchStats({ id: matchStatsDoc.id, ...matchStatsDoc.data() } as MatchStats);
        }

        // Fetch player stats
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

        // Fetch player names
        const playerIds = stats.map(stat => stat.playerId);
        let names: Record<string, string> = {};
        
        if (playerIds.length > 0) {
          const playersQuery = query(
            collection(db, 'users'),
            where('id', 'in', playerIds)
          );
          const playersSnapshot = await getDocs(playersQuery);
          names = playersSnapshot.docs.reduce((acc, doc) => {
            const player = doc.data();
            acc[player.id] = player.name;
            return acc;
          }, {} as Record<string, string>);
        }
        
        setPlayerNames(names);

      } catch (err) {
        console.error('Error fetching match data:', err);
        setError('Failed to load match data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchData();
  }, [matchId]);

  const handlePlayerStatsSubmit = async (stats: Omit<PlayerMatchStats, 'id' | 'status' | 'submittedAt'>) => {
    const newStats = {
      ...stats,
      status: 'pending' as const,
      submittedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'playerMatchStats'), newStats);
    setPlayerStats(prev => [...prev, { id: docRef.id, ...newStats } as PlayerMatchStats]);
  };

  const handleTrainerScoreSubmit = async (stats: Omit<MatchStats, 'id' | 'playerStats'>) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const matchStatsData: Omit<MatchStats, 'id'> = {
        ...stats,
        matchId,
        playerStats: [],
        submittedBy: user.id,
        submittedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Create or update the match stats document
      const matchStatsRef = doc(db, 'matchStats', matchId);
      await setDoc(matchStatsRef, matchStatsData, { merge: true });
      
      // Update local state
      setMatchStats(prev => prev ? { ...prev, ...matchStatsData } : { id: matchId, ...matchStatsData });

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

  const handleReviewPlayerStats = async (playerStatId: string, approved: boolean, comments?: string) => {
    try {
      console.log('Reviewing stats:', { playerStatId, approved, comments });
      
      const updateData: any = {
        status: approved ? 'approved' as const : 'rejected' as const,
        reviewedAt: Timestamp.now(),
        reviewedBy: user?.id,
      };

      // Only add comments if they are provided
      if (comments) {
        updateData.comments = comments;
      }

      console.log('Updating document with:', updateData);
      
      const docRef = doc(db, 'playerMatchStats', playerStatId);
      await updateDoc(docRef, updateData);
      console.log('Update successful');

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
    } catch (error) {
      console.error('Error reviewing player stats:', error);
      Alert.alert(
        'Error',
        'Failed to update player statistics. Please try again.'
      );
    }
  };

  if (!user) return null;

  const userPlayerStats = playerStats.find(stat => stat.playerId === user.id);
  const isPlayerInMatch = matchDetails?.roster?.some(player => player.id === user.id);
  const matchHasEnded = matchDetails?.endTime && matchDetails.endTime.toDate() < new Date();
  const canSubmitStats = user.type === ('player' as UserType) && 
                        !userPlayerStats && 
                        isPlayerInMatch && 
                        !matchHasEnded;
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
        {!isPlayerInMatch
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
    if (!matchHasEnded || user.type !== ('player' as UserType) || userPlayerStats) return null;

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
      {user.type === ('player' as UserType) && isPlayerInMatch && (
        <>
          {canSubmitStats ? (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Submit Your Statistics</Text>
              <PlayerMatchStatsForm
                matchId={matchId}
                playerId={user.id}
                onSubmit={handlePlayerStatsSubmit}
                isGoalkeeper={isGoalkeeper}
              />
            </View>
          ) : userPlayerStats && (
            <>
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>Your Submission Status</Text>
                <View style={[
                  styles.statusCard,
                  userPlayerStats.status === 'approved' && styles.statusApproved,
                  userPlayerStats.status === 'rejected' && styles.statusRejected
                ]}>
                  <Text style={styles.statusText}>
                    {userPlayerStats.status === 'pending' && 'Your statistics are pending review'}
                    {userPlayerStats.status === 'approved' && 'Your statistics have been approved'}
                    {userPlayerStats.status === 'rejected' && 'Your statistics were rejected'}
                  </Text>
                  {userPlayerStats.comments && (
                    <Text style={styles.commentText}>
                      Comments: {userPlayerStats.comments}
                    </Text>
                  )}
                </View>
              </View>
              {userPlayerStats.status === 'approved' && (
                <PlayerPerformanceCard
                  stats={userPlayerStats}
                  isGoalkeeper={isGoalkeeper}
                />
              )}
            </>
          )}
        </>
      )}

      {user.type === ('trainer' as UserType) ? (
        <TrainerMatchStatsForm
          matchId={matchId}
          trainerId={user.id}
          playerStats={playerStats}
          playerNames={playerNames}
          onSubmitScore={handleTrainerScoreSubmit}
          onReviewPlayerStats={handleReviewPlayerStats}
          existingScore={matchStats?.score}
          existingPossession={matchStats?.possession}
          teamId={matchDetails?.teamId || ''}
        />
      ) : (
        <>
          {(!matchStats && !playerStats.length) ? (
            renderEmptyState()
          ) : (
            <MatchScoreDisplay
              score={matchStats?.score}
              possession={matchStats?.possession}
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
}); 