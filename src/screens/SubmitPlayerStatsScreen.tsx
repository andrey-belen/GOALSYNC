import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, addDoc, Timestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.config';
import { theme } from '../theme';
import { PlayerMatchStats } from '../types/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { PlayerMatchStatsForm } from '../components/PlayerMatchStatsForm';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SubmitPlayerStats'>;

interface Player {
  id: string;
  name: string;
  position?: string;
  hasStats: boolean;
  statsStatus?: 'pending' | 'approved' | 'rejected';
  isPresent: boolean;
}

export const SubmitPlayerStatsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { matchId } = route.params;
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerMatchStats['stats']>({
    goals: 0,
    assists: 0,
    shotsOnTarget: 0,
    yellowCards: 0,
    redCards: 0,
    cleanSheet: false,
    minutesPlayed: 90,
    saves: 0,
    goalsConceded: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [existingStatsId, setExistingStatsId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  // Add sorting function
  const sortPlayers = (players: Player[]) => {
    return [...players].sort((a, b) => {
      // First sort by presence
      if (a.isPresent !== b.isPresent) {
        return a.isPresent ? -1 : 1;
      }
      
      // Then sort by status
      const statusOrder = {
        'approved': 0,
        'pending': 1,
        'rejected': 2,
        undefined: 3
      };
      const statusA = statusOrder[a.statsStatus as keyof typeof statusOrder] ?? 3;
      const statusB = statusOrder[b.statsStatus as keyof typeof statusOrder] ?? 3;
      if (statusA !== statusB) {
        return statusA - statusB;
      }

      // Finally sort by name
      return a.name.localeCompare(b.name);
    });
  };

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setIsLoading(true);
        // Get match details to get the roster
        const matchDoc = await getDoc(doc(db, 'events', matchId));
        if (!matchDoc.exists()) {
          Alert.alert('Error', 'Match not found');
          navigation.goBack();
          return;
        }

        const matchData = matchDoc.data();
        const roster = matchData.roster || [];

        // Get player details
        const playerIds = roster.map((player: any) => player.id);
        if (playerIds.length > 0) {
          const playersQuery = query(
            collection(db, 'users'),
            where('id', 'in', playerIds)
          );
          const playersSnapshot = await getDocs(playersQuery);
          
          // Get existing player stats
          const statsQuery = query(
            collection(db, 'playerMatchStats'),
            where('matchId', '==', matchId)
          );
          const statsSnapshot = await getDocs(statsQuery);
          const existingStats = statsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as PlayerMatchStats[];

          const playersData = playersSnapshot.docs.map(doc => {
            const player = doc.data();
            const rosterPlayer = roster.find((p: any) => p.id === player.id);
            const playerStats = existingStats.find(stat => stat.playerId === player.id);
            const isPresent = matchData.attendees?.includes(player.id) || false;
            
            return {
              id: player.id,
              name: player.name,
              position: rosterPlayer?.position,
              hasStats: !!playerStats,
              statsStatus: playerStats?.status,
              isPresent,
            };
          });

          setPlayers(sortPlayers(playersData));
          setSelectedMatch(matchData);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        Alert.alert('Error', 'Failed to load players');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayers();
  }, [matchId]);

  const handlePlayerSelect = async (player: Player) => {
    try {
      // Check if player already has stats
      const statsQuery = query(
        collection(db, 'playerMatchStats'),
        where('matchId', '==', matchId),
        where('playerId', '==', player.id)
      );
      const statsSnapshot = await getDocs(statsQuery);
      
      if (!statsSnapshot.empty) {
        const existingStats = statsSnapshot.docs[0];
        setExistingStatsId(existingStats.id);
        const statsData = existingStats.data();
        
        // If stats are approved and user is not a trainer, prevent editing
        if (statsData.status === 'approved' && user?.type !== 'trainer') {
          Alert.alert('Already Approved', 'This player\'s statistics have already been approved and cannot be modified.');
          return;
        }

        // Pre-fill form with existing stats
        setStats(statsData.stats);
        setIsEditing(true);
      } else {
        // Reset form for new submission
        setStats({
          goals: 0,
          assists: 0,
          shotsOnTarget: 0,
          yellowCards: 0,
          redCards: 0,
          cleanSheet: false,
          minutesPlayed: 90,
          saves: 0,
          goalsConceded: 0
        });
        setIsEditing(false);
        setExistingStatsId(null);
      }
      
      setSelectedPlayer(player);
    } catch (error) {
      console.error('Error loading player stats:', error);
      Alert.alert('Error', 'Failed to load player statistics');
    }
  };

  const handleSubmit = async (formStats: PlayerMatchStats['stats']) => {
    if (!selectedPlayer || !selectedMatch) return;

    console.log('Submitting stats:', formStats); // Debug log

    try {
      setIsSubmitting(true);
      if (isEditing && existingStatsId) {
        await updateDoc(doc(db, 'playerMatchStats', existingStatsId), {
          stats: formStats,
          updatedAt: Timestamp.now(),
        });
      } else {
        const playerStats = {
          matchId: selectedMatch.id,
          playerId: selectedPlayer.id,
          stats: formStats
        };
        console.log('Creating new stats:', playerStats); // Debug log
        await submitPlayerStats(playerStats);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting player stats:', error);
      Alert.alert('Error', 'Failed to submit player stats');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPlayerStats = async (playerStats: Omit<PlayerMatchStats, 'id' | 'status' | 'submittedAt'>) => {
    console.log('Submitting to Firestore:', playerStats); // Debug log
    const playerStatsWithMeta = {
      ...playerStats,
      status: user?.type === 'trainer' ? 'approved' : 'pending',
      submittedAt: Timestamp.now()
    };
    console.log('Final document to save:', playerStatsWithMeta); // Debug log
    await addDoc(collection(db, 'playerMatchStats'), playerStatsWithMeta);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading players...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Submit Player Statistics</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Select Player</Text>
          <ScrollView style={styles.playersList}>
            {players.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerCard,
                  selectedPlayer?.id === player.id && styles.selectedPlayerCard,
                  player.hasStats && styles.hasStatsCard,
                  player.statsStatus === 'approved' && styles.approvedCard,
                  !player.isPresent && styles.absentCard,
                ]}
                onPress={() => {
                  if ((!player.hasStats || user?.type === 'trainer') && player.isPresent) {
                    handlePlayerSelect(player);
                  }
                }}
                disabled={!player.isPresent}
              >
                <View style={styles.playerInfo}>
                  <View style={styles.playerNameContainer}>
                  <Text style={[
                    styles.playerName,
                      player.statsStatus === 'approved' && styles.approvedPlayerName,
                      !player.isPresent && styles.absentPlayerName
                  ]}>
                    {player.name}
                    {player.statsStatus === 'approved' && ' ✓'}
                  </Text>
                    {!player.isPresent && (
                      <View style={styles.absentIcon}>
                        <Text style={styles.absentIconText}>A</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.playerPosition,
                    player.statsStatus === 'approved' && styles.approvedPlayerPosition,
                    !player.isPresent && styles.absentPlayerPosition
                  ]}>
                    {player.position || 'Unassigned'}
                  </Text>
                </View>
                <View style={styles.rightSection}>
                  {player.statsStatus === 'pending' && (
                    <View style={[styles.statusBadge, styles.pendingBadge]}>
                      <Text style={styles.statusText}>Pending</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formSection}>
          {selectedPlayer ? (
            <>
              <Text style={styles.sectionTitle}>Enter Statistics</Text>
              <PlayerMatchStatsForm
                matchId={selectedMatch?.id || ''}
                playerId={selectedPlayer?.id || ''}
                onSubmit={(formStats) => {
                  console.log('Form submitted with stats:', formStats.stats); // Debug log
                  handleSubmit(formStats.stats);
                }}
                isGoalkeeper={selectedPlayer?.position === 'GK'}
                hideSubmitButton={false}
                initialStats={stats}
              />
            </>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Select a player to enter statistics</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  playersSection: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  formSection: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  playersList: {
    flex: 1,
  },
  playerCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disabledPlayerCard: {
    opacity: 0.7,
  },
  selectedPlayerCard: {
    backgroundColor: theme.colors.primary,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  disabledPlayerName: {
    color: theme.colors.text.secondary,
  },
  selectedPlayerName: {
    color: theme.colors.text.inverse,
  },
  playerPosition: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  approvedBadge: {
    backgroundColor: theme.colors.success,
  },
  pendingBadge: {
    backgroundColor: theme.colors.warning,
  },
  rejectedBadge: {
    backgroundColor: theme.colors.error,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.text.inverse,
    fontWeight: 'bold',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  approvedPlayerCard: {
    backgroundColor: theme.colors.success + '20', // 20% opacity
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approvedIcon: {
    backgroundColor: theme.colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  approvedIconText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  approvedPlayerName: {
    color: theme.colors.success,
    fontWeight: '600',
  },
  approvedPlayerPosition: {
    color: theme.colors.success + 'CC', // 80% opacity
  },
  absentPlayerCard: {
    backgroundColor: theme.colors.error + '20', // 20% opacity
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  absentPlayerName: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  absentPlayerPosition: {
    color: theme.colors.error + 'CC', // 80% opacity
  },
  absentIcon: {
    backgroundColor: theme.colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  absentIconText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  hasStatsCard: {
    backgroundColor: theme.colors.success + '20', // 20% opacity
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  approvedCard: {
    backgroundColor: theme.colors.success + '20', // 20% opacity
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  absentCard: {
    opacity: 0.6,
    backgroundColor: theme.colors.error + '20', // 20% opacity
  },
  approvedPlayerName: {
    color: theme.colors.success,
    fontWeight: '600',
  },
  approvedPlayerPosition: {
    color: theme.colors.success + 'CC', // 80% opacity
  },
  absentPlayerName: {
    color: theme.colors.error,
  },
  absentPlayerPosition: {
    color: theme.colors.error + 'CC', // 80% opacity
  },
  absentIcon: {
    backgroundColor: theme.colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  absentIconText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 