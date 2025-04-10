import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, Timestamp, doc, getDoc, query, getDocs, where, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { Event } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'UploadMatchStats'>;

interface Stats {
  goals: number;
  assists: number;
  shotsOnTarget: number;
  yellowCards: number;
  redCards: number;
  cleanSheet: boolean;
}

export const UploadMatchStatsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { matchId } = route.params;
  const { user } = useAuth();
  const [matchDetails, setMatchDetails] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canSubmitStats, setCanSubmitStats] = useState(false);
  const [stats, setStats] = useState<Stats>({
    goals: 0,
    assists: 0,
    shotsOnTarget: 0,
    yellowCards: 0,
    redCards: 0,
    cleanSheet: false,
  });
  const [showYellowCards, setShowYellowCards] = useState(false);
  const [showRedCards, setShowRedCards] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  
  useEffect(() => {
    const checkEligibility = async () => {
      try {
        // Get match details
        const matchDoc = await getDoc(doc(db, 'events', matchId));
        if (!matchDoc.exists()) {
          Alert.alert('Error', 'Match not found');
          navigation.goBack();
          return;
        }

        const matchData = matchDoc.data() as Event;
        setMatchDetails(matchData);

        // Check if user is the team trainer
        const trainerCheck = user?.type === 'trainer' && user?.teamId === matchData.teamId;
        setIsTrainer(trainerCheck);
        
        // Skip roster and attendance checks for the trainer
        if (trainerCheck) {
          console.log('User is the trainer - bypassing roster and attendance checks');
          setCanSubmitStats(true);
          setIsLoading(false);
          return;
        }

        // For players, continue with roster checks
        // Check if player is in roster
        const isInRoster = matchData.roster?.some(player => player.id === user?.id);
        if (!isInRoster) {
          Alert.alert('Not Eligible', 'You are not in the roster for this match');
          navigation.goBack();
          return;
        }

        // Check if player attended
        const isPresent = user?.id ? matchData.attendees?.includes(user.id) || false : false;
        if (!isPresent) {
          Alert.alert('Not Eligible', 'You must be marked as present to submit statistics');
          navigation.goBack();
          return;
        }

        // Check if player already has stats for this match
        const statsQuery = query(
          collection(db, 'playerMatchStats'),
          where('matchId', '==', matchId),
          where('playerId', '==', user?.id)
        );
        const statsSnapshot = await getDocs(statsQuery);
        
        if (!statsSnapshot.empty) {
          const existingStats = statsSnapshot.docs[0].data();
          
          // If stats are approved, prevent resubmission
          if (existingStats.status === 'approved') {
            Alert.alert('Already Submitted', 'Your statistics for this match have already been approved.');
            navigation.goBack();
            return;
          } 
          // If stats are pending, prevent resubmission
          else if (existingStats.status === 'pending') {
            Alert.alert('Already Submitted', 'You have already submitted statistics for this match. Please wait for approval.');
            navigation.goBack();
            return;
          }
          // If stats were rejected, allow resubmission
          else if (existingStats.status === 'rejected') {
            // Allow resubmission by showing an info message but continuing
            Alert.alert(
              'Previous Submission Rejected', 
              'Your previous statistics submission was rejected. You can submit new statistics now.'
            );
          }
        }

        setCanSubmitStats(true);
      } catch (error) {
        console.error('Error checking eligibility:', error);
        Alert.alert('Error', 'Failed to verify eligibility');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    checkEligibility();
  }, [matchId, user?.id, user?.type, user?.teamId, navigation]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Check if the user is a trainer
      const isTrainer = user?.type === 'trainer' && user?.teamId === matchDetails?.teamId;

      if (isTrainer) {
        // For trainers, this creates a match score entry for the team
        // Create match stats document first if it doesn't exist
        const matchStatsRef = doc(db, 'matchStats', matchId);
        const matchStatsDoc = await getDoc(matchStatsRef);

        if (matchStatsDoc.exists()) {
          // Update existing match stats
          await updateDoc(matchStatsRef, {
            score: {
              home: stats.goals,
              away: 0 // The opponent score should be added separately 
            },
            status: 'final',
            updatedAt: Timestamp.now(),
            lastUpdatedBy: user?.id
          });
        } else {
          // Create new match stats
          await setDoc(matchStatsRef, {
            id: matchId,
            matchId: matchId,
            teamId: matchDetails?.teamId,
            score: {
              home: stats.goals,
              away: 0 // The opponent score should be added separately
            },
            status: 'final',
            visibility: 'public',
            submittedBy: user?.id,
            submittedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            playerStats: [],
            allStatsComplete: false
          });
        }

        // Also update the event to mark it as having scores submitted
        const eventRef = doc(db, 'events', matchId);
        await updateDoc(eventRef, {
          scoreSubmitted: true,
          status: 'completed',
          updatedAt: Timestamp.now()
        });

        Alert.alert(
          'Success',
          'Match score has been submitted. You can now add opponent score and player statistics.',
          [{ 
            text: 'OK', 
            onPress: () => navigation.navigate('MatchStats', { matchId, isHomeGame: true })
          }]
        );
      } else {
        // Regular player stats submission logic
        
        // Check if player has rejected stats and delete them first
        const statsQuery = query(
          collection(db, 'playerMatchStats'),
          where('matchId', '==', matchId),
          where('playerId', '==', user?.id),
          where('status', '==', 'rejected')
        );
        const statsSnapshot = await getDocs(statsQuery);
        
        // If there are rejected stats, delete them
        if (!statsSnapshot.empty) {
          const rejectedStatId = statsSnapshot.docs[0].id;
          await deleteDoc(doc(db, 'playerMatchStats', rejectedStatId));
          console.log('Deleted rejected stats:', rejectedStatId);
        }

        // Create new player stats
        const playerStats = {
          matchId,
          playerId: user?.id,
          stats: {
            ...stats,
            minutesPlayed: 90, // Default to full match
          },
          status: 'pending',
          submittedAt: Timestamp.now(),
        };

        await addDoc(collection(db, 'playerMatchStats'), playerStats);
        
        Alert.alert(
          'Success',
          'Your match statistics have been submitted and are pending review.',
          [{ 
            text: 'OK', 
            onPress: () => navigation.navigate('MatchStats', { matchId, isHomeGame: true })
          }]
        );
      }
    } catch (error) {
      console.error('Error submitting stats:', error);
      Alert.alert(
        'Error',
        'Failed to submit match statistics. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Checking eligibility...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!canSubmitStats) {
    return null;
  }

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isTrainer ? 'Submit Match Score' : 'Upload Match Statistics'}
          </Text>
          <Text style={styles.subtitle}>
            {isTrainer
              ? 'Enter the score for your team and mark the match as completed' 
              : 'Enter your performance stats for this match'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.label}>
                {isTrainer ? 'Team Goals' : 'Goals'}
              </Text>
              <View style={styles.statInputContainer}>
                <TouchableOpacity 
                  style={styles.statButton}
                  onPress={() => setStats(prev => ({ ...prev, goals: Math.max(0, prev.goals - 1) }))}
                >
                  <Text style={styles.statButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.statValue}>{stats.goals}</Text>
                <TouchableOpacity 
                  style={styles.statButton}
                  onPress={() => setStats(prev => ({ ...prev, goals: prev.goals + 1 }))}
                >
                  <Text style={styles.statButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!isTrainer && (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.label}>Assists</Text>
                  <View style={styles.statInputContainer}>
                    <TouchableOpacity 
                      style={styles.statButton}
                      onPress={() => setStats(prev => ({ ...prev, assists: Math.max(0, prev.assists - 1) }))}
                    >
                      <Text style={styles.statButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.statValue}>{stats.assists}</Text>
                    <TouchableOpacity 
                      style={styles.statButton}
                      onPress={() => setStats(prev => ({ ...prev, assists: prev.assists + 1 }))}
                    >
                      <Text style={styles.statButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.label}>Shots on Target</Text>
                  <View style={styles.statInputContainer}>
                    <TouchableOpacity 
                      style={styles.statButton}
                      onPress={() => setStats(prev => ({ ...prev, shotsOnTarget: Math.max(0, prev.shotsOnTarget - 1) }))}
                    >
                      <Text style={styles.statButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.statValue}>{stats.shotsOnTarget}</Text>
                    <TouchableOpacity 
                      style={styles.statButton}
                      onPress={() => setStats(prev => ({ ...prev, shotsOnTarget: prev.shotsOnTarget + 1 }))}
                    >
                      <Text style={styles.statButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.label}>Yellow Cards</Text>
                  <Switch
                    value={showYellowCards}
                    onValueChange={setShowYellowCards}
                  />
                  {showYellowCards && (
                    <View style={styles.cardInputContainer}>
                      <TouchableOpacity 
                        style={styles.statButton}
                        onPress={() => setStats(prev => ({ ...prev, yellowCards: Math.max(0, prev.yellowCards - 1) }))}
                      >
                        <Text style={styles.statButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.statValue}>{stats.yellowCards}</Text>
                      <TouchableOpacity 
                        style={styles.statButton}
                        onPress={() => setStats(prev => ({ ...prev, yellowCards: Math.min(2, prev.yellowCards + 1) }))}
                      >
                        <Text style={styles.statButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.label}>Red Cards</Text>
                  <Switch
                    value={showRedCards}
                    onValueChange={setShowRedCards}
                  />
                  {showRedCards && (
                    <View style={styles.cardInputContainer}>
                      <TouchableOpacity 
                        style={styles.statButton}
                        onPress={() => setStats(prev => ({ ...prev, redCards: Math.max(0, prev.redCards - 1) }))}
                      >
                        <Text style={styles.statButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.statValue}>{stats.redCards}</Text>
                      <TouchableOpacity 
                        style={styles.statButton}
                        onPress={() => setStats(prev => ({ ...prev, redCards: Math.min(1, prev.redCards + 1) }))}
                      >
                        <Text style={styles.statButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.label}>Clean Sheet</Text>
                  <Switch
                    value={stats.cleanSheet}
                    onValueChange={(value) => setStats(prev => ({ ...prev, cleanSheet: value }))}
                  />
                </View>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.submitText}>Submitting...</Text>
            ) : (
              <Text style={styles.submitText}>
                {isTrainer ? 'Submit Match Score' : 'Submit Statistics'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    marginTop: theme.spacing.md,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a305e',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  form: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  label: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginBottom: theme.spacing.xs,
  },
  statInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  statButton: {
    backgroundColor: theme.colors.card,
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statButtonText: {
    color: theme.colors.text.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  statValue: {
    color: theme.colors.text.primary,
    fontSize: 20,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 