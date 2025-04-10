import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { SelectedPlayer } from '../types/formation';
import { auth, getUser, getTeamMembers } from '../config/firebase';
import { TeamMember } from '../types/database';

interface FormationSetupParams {
  formation: string;
  players: Array<{
    id: string;
    name: string;
    position?: string;
    number?: string;
    isStarter?: boolean;
    fieldPosition?: string;
    status?: string;
  }>;
  onComplete?: (positions: any) => void;
}

type Props = NativeStackScreenProps<RootStackParamList, 'FormationSetup'>;

interface Player extends SelectedPlayer {
  // Any additional properties needed specifically in this component
}

interface Position {
  id: string;
  position: string;
  x: number;
  y: number;
}

interface PlayerPosition {
  playerId: string;
  position: string;
}

const FIELD_RATIO = 68 / 105; // Standard football field ratio
const FIELD_PADDING = 20;
const screenWidth = Dimensions.get('window').width - (FIELD_PADDING * 2);
const fieldHeight = screenWidth * FIELD_RATIO;

const getFormationPositions = (formation: string): Position[] => {
  // Define standard positions for each formation
  const formations: { [key: string]: Position[] } = {
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

export const FormationSetup = ({ route, navigation }: Props) => {
  const { formation } = route.params;
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPositions, setSelectedPositions] = useState<PlayerPosition[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [showInjuryWarning, setShowInjuryWarning] = useState(false);

  useEffect(() => {
    loadTeamPlayers();
  }, []);

  const loadTeamPlayers = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // If players were passed in from navigation params, use those
      if (route.params.players && route.params.players.length > 0) {
        // Convert the incoming players to the Player type
        const convertedPlayers: Player[] = route.params.players.map(p => ({
          id: p.id,
          name: p.name,
          number: p.number || '0',
          position: (p.position || 'DEF') as 'GK' | 'DEF' | 'MID' | 'FWD',
          isStarter: Boolean(p.isStarter),
          fieldPosition: p.fieldPosition,
          status: (p.status || 'active') as 'active' | 'injured'
        }));
        
        setPlayers(convertedPlayers);

        // Initialize selectedPositions with current player positions
        const initialPositions = convertedPlayers
          .filter(p => p.isStarter && p.fieldPosition)
          .map(p => ({
            playerId: p.id,
            position: p.fieldPosition as string
          }));
        setSelectedPositions(initialPositions);
        
        setLoading(false);
        return;
      }

      const userData = await getUser(currentUser.uid);
      if (!userData?.teamId) return;

      const teamMembers = await getTeamMembers(userData.teamId) as TeamMember[];
      const playerMembers: Player[] = teamMembers
        .filter((member) => member.role === 'player')
        .map((member) => ({
          id: member.id,
          name: member.name,
          number: member.number || '0',
          position: (member.position?.toUpperCase() || 'DEF') as 'GK' | 'DEF' | 'MID' | 'FWD',
          isStarter: true,
          status: (member.status || 'active') as 'active' | 'injured'
        }));

      setPlayers(playerMembers);
    } catch (error) {
      console.error('Error loading team players:', error);
      Alert.alert('Error', 'Failed to load team players');
    } finally {
      setLoading(false);
    }
  };

  const positions = getFormationPositions(formation);
  const starters = players.filter((p: Player) => p.isStarter);
  const substitutes = players.filter((p: Player) => !p.isStarter);

  const handlePositionPress = (position: Position) => {
    // Check if there's already a player assigned to this position
    const assignedPlayer = players.find(
      p => selectedPositions.find(sp => sp.position === position.id)?.playerId === p.id
    );

    if (assignedPlayer) {
      // If there's an assigned player, remove them from this position
      const newSelectedPositions = selectedPositions.filter(
        pos => pos.position !== position.id
      );
      setSelectedPositions(newSelectedPositions);
      return;
    }

    // If no player is assigned, open the modal to select a player
    setSelectedPositionId(position.id);
    setModalVisible(true);
  };

  const handlePlayerSelect = (player: Player) => {
    if (!selectedPositionId) {
      // If no position is selected, we're adding a substitute
      const updatedPlayers = players.map(p => {
        if (p.id === player.id) {
          return { ...p, isStarter: false };
        }
        return p;
      });
      setPlayers(updatedPlayers);
      setModalVisible(false);
      return;
    }

    // If position is selected, we're assigning a starter position
    const newSelectedPositions = selectedPositions.filter(
      pos => pos.playerId !== player.id && pos.position !== selectedPositionId
    );

    newSelectedPositions.push({
      playerId: player.id,
      position: selectedPositionId,
    });

    // Update the player to be a starter
    const updatedPlayers = players.map(p => {
      if (p.id === player.id) {
        return { ...p, isStarter: true };
      }
      return p;
    });

    setPlayers(updatedPlayers);
    setSelectedPositions(newSelectedPositions);
    setModalVisible(false);
    setSelectedPositionId(null);
  };

  const getInjuredPlayers = () => {
    return selectedPositions
      .map(pos => players.find(p => p.id === pos.playerId))
      .filter((player): player is Player => player !== undefined && player.status === 'injured');
  };

  const handleConfirm = async () => {
    // Check if all starting positions are filled
    const requiredPositions = positions.length;
    const filledPositions = selectedPositions.length;
    
    if (filledPositions !== requiredPositions) {
      Alert.alert('Error', `Please assign positions to all ${requiredPositions} starting positions`);
      return;
    }

    // Check for injured players
    const injuredPlayers = getInjuredPlayers();
    if (injuredPlayers.length > 0) {
      const injuredNames = injuredPlayers.map(p => `#${p.number} ${p.name}`).join('\n');
      Alert.alert(
        'Warning: Injured Players',
        `The following players are marked as injured but are assigned to positions:\n\n${injuredNames}\n\nDo you want to proceed with this formation?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Proceed',
            onPress: () => {
              saveFormation();
            }
          }
        ]
      );
      return;
    }

    saveFormation();
  };

  const saveFormation = () => {
    console.log('Final Selected Positions:', selectedPositions);
    console.log('Positions:', positions);

    const playersWithPositions: SelectedPlayer[] = players.map((player: Player) => {
      const position = selectedPositions.find(sp => sp.playerId === player.id);
      return {
        id: player.id,
        name: player.name,
        number: player.number.toString(),
        position: player.position,
        isStarter: player.isStarter,
        fieldPosition: position?.position || undefined,
        status: player.status || 'active'
      };
    });

    if (route.params.onComplete) {
      route.params.onComplete(playersWithPositions);
      navigation.goBack();
    } else {
      console.error('onComplete callback is not defined');
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const renderField = () => (
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
        const assignedPlayer = players.find(
          p => selectedPositions.find(sp => sp.position === pos.id)?.playerId === p.id
        );
        
        return (
          <TouchableOpacity
            key={pos.id}
            style={[
              styles.position,
              selectedPositionId === pos.id && styles.positionSelected,
              assignedPlayer && styles.positionAssigned,
              assignedPlayer?.status === 'injured' && styles.positionInjured,
              {
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                backgroundColor: assignedPlayer 
                  ? assignedPlayer.status === 'injured' 
                    ? '#ff4444' 
                    : theme.colors.primary 
                  : '#2a305e',
                borderWidth: assignedPlayer ? 1 : 0,
                borderColor: '#fff',
              },
            ]}
            onPress={() => handlePositionPress(pos)}
          >
            <Text style={[
              styles.positionText,
              assignedPlayer && styles.assignedPositionText
            ]}>
              {pos.position}
            </Text>
            {assignedPlayer && (
              <Text style={styles.playerNumber}>#{assignedPlayer.number}</Text>
            )}
            {assignedPlayer?.status === 'injured' && (
              <View style={styles.injuredIndicator}>
                <Text style={styles.injuredText}>INJ</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderPlayerModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedPositionId ? 'Select Player for Position' : 'Add Substitute'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {players
              .filter(player => {
                if (selectedPositionId) {
                  // For position assignment, show unassigned players and the current player in this position
                  const isAssignedToOtherPosition = selectedPositions.some(
                    pos => pos.playerId === player.id && pos.position !== selectedPositionId
                  );
                  return !isAssignedToOtherPosition && player.isStarter;
                } else {
                  // For substitute selection, show only starters that aren't in positions
                  return player.isStarter && !selectedPositions.some(pos => pos.playerId === player.id);
                }
              })
              .map((player) => {
                const isAssigned = selectedPositions.some(
                  pos => pos.playerId === player.id
                );
                const isInjured = player.status === 'injured';
                
                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerOption,
                      isAssigned && styles.playerOptionAssigned,
                      isInjured && styles.playerOptionInjured
                    ]}
                    onPress={() => {
                      if (!isInjured) {
                        handlePlayerSelect(player);
                      }
                    }}
                    disabled={isInjured}
                  >
                    <View style={styles.playerOptionContent}>
                      <Text style={[
                        styles.playerOptionName,
                        isAssigned && styles.playerOptionAssignedText,
                        isInjured && styles.playerOptionInjuredText
                      ]}>
                        #{player.number} {player.name}
                      </Text>
                      {isInjured && (
                        <View style={styles.injuredBadge}>
                          <Text style={styles.injuredBadgeText}>INJURED</Text>
                        </View>
                      )}
                    </View>
                    {isAssigned && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderInjuryWarning = () => {
    const injuredPlayers = getInjuredPlayers();
    if (injuredPlayers.length === 0) return null;

    return (
      <View style={styles.warningContainer}>
        <View style={styles.warningContent}>
          <Ionicons name="warning" size={20} color="#ff4444" />
          <Text style={styles.warningText}>
            {injuredPlayers.length} injured player{injuredPlayers.length > 1 ? 's' : ''} assigned to positions
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Tap on a position to assign a player</Text>
      
      {renderInjuryWarning()}
      
      {renderField()}

      <View style={styles.substitutesContainer}>
        <View style={styles.substitutesHeader}>
          <Text style={styles.sectionTitle}>Substitutes</Text>
          <TouchableOpacity
            style={styles.addSubstituteButton}
            onPress={() => {
              setSelectedPositionId(null);
              setModalVisible(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.addSubstituteText}>Add Substitute</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.substitutesScrollContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.substitutesScrollContent}
          >
            {substitutes.length > 0 ? (
              substitutes.map(player => (
                <View key={player.id} style={styles.substituteCard}>
                  <TouchableOpacity
                    style={styles.removeSubstituteButton}
                    onPress={() => {
                      const updatedPlayers = players.map(p => {
                        if (p.id === player.id) {
                          return { ...p, isStarter: true };
                        }
                        return p;
                      });
                      setPlayers(updatedPlayers);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#ff4444" />
                  </TouchableOpacity>
                  <Text style={styles.playerNumber}>#{player.number}</Text>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerPosition}>{player.position}</Text>
                  {player.status === 'injured' && (
                    <View style={styles.substituteInjuredBadge}>
                      <Text style={styles.substituteInjuredText}>INJURED</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.noSubstitutesMessage}>
                <Text style={styles.noSubstitutesText}>No substitutes added</Text>
                <Text style={styles.noSubstitutesSubtext}>Tap the "Add Substitute" button to add players</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {renderPlayerModal()}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Confirm Formation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: FIELD_PADDING / 2,
    paddingBottom: FIELD_PADDING,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 10,
  },
  field: {
    flex: 1,
    backgroundColor: '#1a8f3c',
    borderRadius: 12,
    position: 'relative',
    marginBottom: 12,
    aspectRatio: 0.75,
    alignSelf: 'center',
    width: '100%',
    maxHeight: '60%',
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
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#2a305e',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -22.5 }, { translateY: -22.5 }],
  },
  positionSelected: {
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  positionAssigned: {
    backgroundColor: '#2a305e',
  },
  positionText: {
    color: theme.colors.text.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  assignedPositionText: {
    fontWeight: 'bold',
  },
  playerNumber: {
    color: theme.colors.text.primary,
    fontSize: 9,
  },
  substitutesContainer: {
    marginBottom: 12,
    minHeight: 140,
  },
  substitutesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  addSubstituteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSubstituteText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  substitutesScrollContainer: {
    minHeight: 100,
    borderRadius: 12,
    backgroundColor: '#1a1f3d',
    padding: 8,
  },
  substitutesScrollContent: {
    paddingVertical: 10,
    minWidth: '100%',
  },
  substituteCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 100,
    alignItems: 'center',
  },
  removeSubstituteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
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
  footer: {
    marginTop: 8,
  },
  confirmButton: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalBody: {
    maxHeight: '80%',
  },
  playerOption: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  playerOptionAssigned: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  playerOptionInjured: {
    opacity: 0.5,
  },
  playerOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerOptionName: {
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  playerOptionAssignedText: {
    fontWeight: 'bold',
  },
  playerOptionInjuredText: {
    color: '#ff4444',
  },
  injuredBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  injuredBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionInjured: {
    backgroundColor: '#ff4444',
  },
  injuredIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  injuredText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
  },
  substituteInjuredBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  substituteInjuredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noSubstitutesMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    minHeight: 120,
  },
  noSubstitutesText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  noSubstitutesSubtext: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
});