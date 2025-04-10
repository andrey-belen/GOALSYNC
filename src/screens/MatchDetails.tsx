import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { SelectedPlayer } from '../types/formation';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchDetails'>;

const FIELD_RATIO = 68 / 105; // Standard football field ratio
const FIELD_PADDING = 20;
const screenWidth = Dimensions.get('window').width - (FIELD_PADDING * 2);
const fieldHeight = screenWidth * FIELD_RATIO;

const formatDateTime = (date: Date | undefined, time: string | Date | undefined) => {
  if (!date) return '';
  const dateStr = date.toLocaleDateString();
  let timeStr = '';
  
  if (time instanceof Date) {
    timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (typeof time === 'string') {
    timeStr = time;
  }
  
  return `${dateStr} at ${timeStr}`;
};

const getFormationPositions = (formation: string): { id: string; position: string; x: number; y: number; }[] => {
  // Define standard positions for each formation
  const formations: { [key: string]: { id: string; position: string; x: number; y: number; }[] } = {
    '4-4-2': [
      // GK
      { x: 50, y: 90, position: 'GK', id: 'GK1' },
      // Defenders
      { x: 15, y: 70, position: 'LB', id: 'LB1' },
      { x: 35, y: 70, position: 'CB', id: 'CB1' },
      { x: 65, y: 70, position: 'CB', id: 'CB2' },
      { x: 85, y: 70, position: 'RB', id: 'RB1' },
      // Midfielders
      { x: 15, y: 45, position: 'LM', id: 'LM1' },
      { x: 35, y: 45, position: 'CM', id: 'CM1' },
      { x: 65, y: 45, position: 'CM', id: 'CM2' },
      { x: 85, y: 45, position: 'RM', id: 'RM1' },
      // Forwards
      { x: 35, y: 20, position: 'ST', id: 'ST1' },
      { x: 65, y: 20, position: 'ST', id: 'ST2' },
    ],
    '4-3-3': [
      // GK
      { x: 50, y: 90, position: 'GK', id: 'GK1' },
      // Defenders
      { x: 15, y: 70, position: 'LB', id: 'LB1' },
      { x: 35, y: 70, position: 'CB', id: 'CB1' },
      { x: 65, y: 70, position: 'CB', id: 'CB2' },
      { x: 85, y: 70, position: 'RB', id: 'RB1' },
      // Midfielders
      { x: 30, y: 45, position: 'CM', id: 'CM1' },
      { x: 50, y: 45, position: 'CM', id: 'CM2' },
      { x: 70, y: 45, position: 'CM', id: 'CM3' },
      // Forwards
      { x: 15, y: 20, position: 'LW', id: 'LW1' },
      { x: 50, y: 20, position: 'ST', id: 'ST1' },
      { x: 85, y: 20, position: 'RW', id: 'RW1' },
    ],
    // Add more formations as needed
  };

  return formations[formation] || formations['4-4-2'];
};

export const MatchDetails = ({ route, navigation }: Props) => {
  const { matchDetails } = route.params;
  const { user } = useAuth();
  const isCoach = user?.type === 'trainer';

  // Find the current player's position in the match
  const currentPlayerPosition = !isCoach && user?.id ? 
    matchDetails.players.find((p: SelectedPlayer) => p.id === user.id)?.fieldPosition : null;

  // Check for injured players
  const injuredPlayers = matchDetails.players.filter((p: SelectedPlayer) => p.status === 'injured');
  const hasInjuredPlayers = injuredPlayers.length > 0;

  const [hasSubmittedStats, setHasSubmittedStats] = useState<boolean | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsReleased, setStatsReleased] = useState<boolean | null>(null);
  const [isCheckingStatsRelease, setIsCheckingStatsRelease] = useState(false);

  const handleEditFormation = () => {
    navigation.navigate('FormationSetup', {
      formation: matchDetails.formation,
      players: matchDetails.players.map(player => ({
        id: player.id,
        name: player.name,
        number: player.number,
        position: player.position,
        isStarter: player.isStarter,
        fieldPosition: player.fieldPosition,
        status: player.status
      })),
      onComplete: async (players: SelectedPlayer[]) => {
        try {
          // Update the event in Firestore
          const eventRef = doc(db, 'events', matchDetails.id);
          await updateDoc(eventRef, {
            formation: matchDetails.formation,
            roster: players.map(player => ({
              id: player.id,
              name: player.name,
              number: player.number.toString(),
              position: player.position,
              isStarter: player.isStarter ?? false,
              fieldPosition: player.fieldPosition || '',
              status: player.status || 'active'
            })),
            updatedAt: new Date()
          });

          // Update the local state
          const updatedMatchDetails = {
            ...matchDetails,
            players: players
          };
          navigation.setParams({ matchDetails: updatedMatchDetails });
        } catch (error) {
          console.error('Error updating formation:', error);
          Alert.alert('Error', 'Failed to save formation changes. Please try again.');
        }
      },
      id: matchDetails.id,
      title: matchDetails.title,
      date: matchDetails.date,
      time: matchDetails.time,
      location: matchDetails.location,
      isHomeGame: matchDetails.isHomeGame,
      opponent: matchDetails.opponent,
      notes: matchDetails.notes
    });
  };

  const handleViewStats = () => {
    navigation.navigate('MatchStats', {
      matchId: matchDetails.id,
      isHomeGame: matchDetails.isHomeGame
    });
  };

  const handleUploadStats = () => {
    navigation.navigate('UploadMatchStats', {
      matchId: matchDetails.id
    });
  };

  const handleSaveChanges = async () => {
    try {
      if (!matchDetails) return;

      // Update the event with new formation and player positions
      const updatedMatchDetails = {
        ...matchDetails,
        formation: matchDetails.formation,
        players: matchDetails.players.map(player => ({
          ...player,
          fieldPosition: player.fieldPosition
        }))
      };

      // Save to Firestore
      const eventRef = doc(db, 'events', matchDetails.id);
      await updateDoc(eventRef, {
        formation: matchDetails.formation,
        roster: updatedMatchDetails.players.map(player => ({
          id: player.id,
          name: player.name,
          number: player.number.toString(),
          position: player.position,
          isStarter: player.isStarter ?? false,
          fieldPosition: player.fieldPosition || '',
          status: player.status || 'active'
        })),
        updatedAt: new Date()
      });

      Alert.alert('Success', 'Match formation updated successfully');
      
      // Reset navigation stack and go to Calendar screen to refresh
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            params: { screen: 'Calendar' }
          },
        ],
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  // Check if player has already submitted stats
  const checkPlayerStats = async () => {
    if (!user?.id || isCoach) return;

    setIsLoadingStats(true);
    try {
      // Check if player already has stats for this match
      const statsQuery = query(
        collection(db, 'playerMatchStats'),
        where('matchId', '==', matchDetails.id),
        where('playerId', '==', user.id)
      );
      const statsSnapshot = await getDocs(statsQuery);
      setHasSubmittedStats(!statsSnapshot.empty);
    } catch (error) {
      console.error('Error checking player stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Check if match stats are released
  const checkMatchStatsReleased = async () => {
    if (!matchDetails?.id) return;

    setIsCheckingStatsRelease(true);
    try {
      // Query for match stats document
      const matchStatsRef = doc(db, 'matchStats', matchDetails.id);
      const matchStatsDoc = await getDoc(matchStatsRef);
      
      if (matchStatsDoc.exists()) {
        const matchStatsData = matchStatsDoc.data();
        setStatsReleased(matchStatsData.visibility === 'public');
      } else {
        setStatsReleased(false);
      }
    } catch (error) {
      console.error('Error checking match stats release status:', error);
      setStatsReleased(false);
    } finally {
      setIsCheckingStatsRelease(false);
    }
  };

  // Check if attendance has been marked for this match
  const checkAttendanceMarked = async () => {
    if (!matchDetails?.id) return false;
    
    try {
      const eventDoc = await getDoc(doc(db, 'events', matchDetails.id));
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        // Consider attendance marked if there are any attendees or absentees
        return (eventData.attendees?.length > 0 || eventData.absentees?.length > 0);
      }
      return false;
    } catch (error) {
      console.error('Error checking attendance status:', error);
      return false;
    }
  };

  // Call the release check when the component mounts
  useEffect(() => {
    if (matchDetails?.id) {
      checkMatchStatsReleased();
      checkPlayerStats();
    }
  }, [matchDetails?.id, user?.id]);

  const handleStatsAction = async () => {
    if (isCoach) {
      // Trainers need attendance to be marked first
      const attendanceMarked = await checkAttendanceMarked();
      if (!attendanceMarked) {
        Alert.alert(
          'Attendance Required', 
          'You must mark attendance for this match before accessing statistics.',
          [
            { 
              text: 'Go to Attendance', 
              onPress: () => navigation.navigate('Attendance', { 
                eventId: matchDetails.id,
                eventType: 'match',
                title: matchDetails.title,
                date: matchDetails.date,
                time: matchDetails.time,
                location: matchDetails.location,
                notes: matchDetails.notes
              }) 
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }
      
      // If attendance is marked, proceed to stats screen
      handleViewStats();
    } else if (hasSubmittedStats) {
      // Players with submitted stats navigate to view stats if stats are released
      if (statsReleased) {
        handleViewStats();
      } else {
        Alert.alert(
          'Statistics Not Released', 
          'Match statistics have not been released by the trainer yet. Please check back later.'
        );
      }
    } else {
      // Players without stats navigate to upload stats
      handleUploadStats();
    }
  };

  const renderField = () => {
    const positions = getFormationPositions(matchDetails.formation);
    
    return (
      <View style={styles.field}>
        {/* Field markings */}
        <View style={styles.centerCircle} />
        <View style={styles.centerLine} />
        <View style={styles.penaltyBox} />
        <View style={styles.penaltyBox2} />
        <View style={styles.goalBox} />
        <View style={styles.goalBox2} />

        {/* Player positions */}
        {positions.map((pos) => {
          const assignedPlayer = matchDetails.players.find(
            p => p.fieldPosition === pos.id && p.isStarter
          );

          const isCurrentPlayer = assignedPlayer?.id === user?.id;
          const isInjured = assignedPlayer?.status === 'injured';
          
          return (
            <View
              key={pos.id}
              style={[
                styles.position,
                {
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  backgroundColor: isInjured ? '#ff4444' : 
                    isCurrentPlayer ? '#e17777' : 
                    assignedPlayer ? '#4a5396' : '#2a305e',
                  borderWidth: isCurrentPlayer ? 2 : assignedPlayer ? 1 : 0,
                  borderColor: '#fff',
                },
              ]}
            >
              <Text style={[
                styles.positionText,
                assignedPlayer && styles.assignedPositionText
              ]}>
                {pos.position}
              </Text>
              {assignedPlayer && (
                <>
                  <Text style={[
                    styles.playerNumber,
                    isCurrentPlayer && styles.currentPlayerNumber
                  ]}>
                    #{assignedPlayer.number}
                  </Text>
                  {isInjured && (
                    <View style={styles.injuredBadge}>
                      <Text style={styles.injuredBadgeText}>INJ</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderPlayerList = () => {
    const starters = matchDetails.players.filter((p: SelectedPlayer) => p.isStarter);
    const substitutes = matchDetails.players.filter((p: SelectedPlayer) => !p.isStarter);

    return (
      <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Starting Lineup</Text>
          <View style={styles.playerGrid}>
            {starters.map((player: SelectedPlayer) => (
              <View 
                key={player.id} 
                style={[
                  styles.playerCard,
                  player.id === user?.id && styles.currentPlayerCard,
                  player.status === 'injured' && styles.injuredPlayerCard
                ]}
              >
                <Text style={[
                  styles.playerNumber,
                  player.status === 'injured' && styles.injuredPlayerText
                ]}>#{player.number}</Text>
                <Text style={[
                  styles.playerName,
                  player.status === 'injured' && styles.injuredPlayerText
                ]}>{player.name}</Text>
                <Text style={styles.playerPosition}>{player.fieldPosition}</Text>
                {player.status === 'injured' && (
                  <View style={styles.injuredIndicator}>
                    <Text style={styles.injuredIndicatorText}>INJURED</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Substitutes</Text>
          <View style={styles.playerGrid}>
            {substitutes.map((player: SelectedPlayer) => (
              <View 
                key={player.id} 
                style={[
                  styles.playerCard,
                  player.id === user?.id && styles.currentPlayerCard,
                  player.status === 'injured' && styles.injuredPlayerCard
                ]}
              >
                <Text style={[
                  styles.playerNumber,
                  player.status === 'injured' && styles.injuredPlayerText
                ]}>#{player.number}</Text>
                <Text style={[
                  styles.playerName,
                  player.status === 'injured' && styles.injuredPlayerText
                ]}>{player.name}</Text>
                <Text style={styles.playerPosition}>{player.position}</Text>
                {player.status === 'injured' && (
                  <View style={styles.injuredIndicator}>
                    <Text style={styles.injuredIndicatorText}>INJURED</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </>
    );
  };

  const renderInjuryWarning = () => {
    if (!hasInjuredPlayers || !isCoach) return null;

    return (
      <View style={styles.warningContainer}>
        <View style={styles.warningContent}>
          <Ionicons name="warning" size={20} color="#ff4444" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Injured Players Warning</Text>
            <Text style={styles.warningText}>
              {injuredPlayers.length} player{injuredPlayers.length > 1 ? 's are' : ' is'} marked as injured:
            </Text>
            {injuredPlayers.map(player => (
              <Text key={player.id} style={styles.injuredPlayerText}>
                #{player.number} {player.name} - {player.fieldPosition}
              </Text>
            ))}
            <Text style={styles.warningAction}>
              Please review and adjust the formation if needed.
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{matchDetails.title}</Text>
          <Text style={styles.subtitle}>
                  {formatDateTime(matchDetails.date, matchDetails.time)}
                </Text>
          <Text style={styles.location}>{matchDetails.location}</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.statsButton, isLoadingStats && styles.disabledButton]} 
              onPress={handleStatsAction}
              disabled={isLoadingStats || isCheckingStatsRelease}
            >
              <Ionicons
                name={
                  isCheckingStatsRelease || isLoadingStats 
                    ? "hourglass-outline"
                    : isCoach 
                      ? "stats-chart" 
                      : hasSubmittedStats 
                        ? statsReleased 
                          ? "stats-chart" 
                          : "lock-closed"
                        : "cloud-upload-outline"
                }
                size={20}
                color="#fff"
              />
              <Text style={styles.statsButtonText}>
                {isCheckingStatsRelease || isLoadingStats 
                  ? "Loading..." 
                  : isCoach
                    ? "Match Stats"
                    : hasSubmittedStats
                      ? statsReleased
                        ? "View Stats"
                        : "Stats Not Released"
                      : "Upload Stats"
                }
              </Text>
            </TouchableOpacity>
          </View>
          </View>

          {renderInjuryWarning()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Formation</Text>
            <View style={styles.formationCard}>
              <Text style={styles.formationText}>{matchDetails.formation}</Text>
              {isCoach && (
              <TouchableOpacity
                style={styles.formationEditButton}
                onPress={handleEditFormation}
              >
                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.editButtonText}>Edit Formation</Text>
              </TouchableOpacity>
              )}
              {!isCoach && currentPlayerPosition && (
                <View style={styles.playerPositionBadge}>
                  <Text style={styles.playerPositionText}>
                    Your Position: {currentPlayerPosition}
                  </Text>
                </View>
              )}
            </View>
            {renderField()}
          </View>

          {renderPlayerList()}

          {matchDetails.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notes}>{matchDetails.notes}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cancelButton, !isCoach && styles.fullWidthButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Back</Text>
          </TouchableOpacity>
          {isCoach && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleSaveChanges}
            >
              <Text style={styles.confirmButtonText}>Save Changes</Text>
            </TouchableOpacity>
          )}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  location: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a305e',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  formationCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formationText: {
    fontSize: 18,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  formationEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editButtonText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  field: {
    backgroundColor: '#1a8f3c', // Green field color
    borderRadius: 12,
    position: 'relative',
    marginBottom: 20,
    aspectRatio: 2/3,
    alignSelf: 'center', // Center the field
    width: '100%', // Take full width
    maxWidth: 400, // Maximum width to maintain proportions
  },
  centerCircle: {
    position: 'absolute',
    width: '30%',
    height: '15%',
    borderRadius: 999,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    left: '35%',
    top: '42.5%',
  },
  centerLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    top: '50%',
  },
  penaltyBox: {
    position: 'absolute',
    width: '60%',
    height: '25%',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    top: 0,
    left: '20%',
  },
  penaltyBox2: {
    position: 'absolute',
    width: '60%',
    height: '25%',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    bottom: 0,
    left: '20%',
  },
  goalBox: {
    position: 'absolute',
    width: '30%',
    height: '10%',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    top: 0,
    left: '35%',
  },
  goalBox2: {
    position: 'absolute',
    width: '30%',
    height: '10%',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    bottom: 0,
    left: '35%',
  },
  position: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2a305e',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  positionText: {
    color: theme.colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  assignedPositionText: {
    color: '#fff',
    fontSize: 10,
  },
  playerNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  currentPlayerNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playerCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 12,
    width: '31%',
    alignItems: 'center',
  },
  currentPlayerCard: {
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  playerName: {
    color: theme.colors.text.primary,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  playerPosition: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  notes: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a305e',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2a305e',
    alignItems: 'center',
  },
  fullWidthButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  confirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerPositionBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 8,
  },
  playerPositionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  warningText: {
    color: '#ff4444',
    fontSize: 14,
    marginBottom: 8,
  },
  injuredPlayerText: {
    color: '#ff4444',
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 4,
  },
  warningAction: {
    color: '#ff4444',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  injuredPlayerCard: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  injuredBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  injuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  injuredIndicator: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  injuredIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  buttonBackground: {
    backgroundColor: theme.colors.background,
  },
  statsButton: {
    backgroundColor: theme.colors.primary,
  },
  uploadButton: {
    backgroundColor: theme.colors.background,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  statsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.7,
  },
}); 