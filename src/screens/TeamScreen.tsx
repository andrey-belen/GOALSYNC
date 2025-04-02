import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { getTeamMembers, deleteTeam, auth, getUser, getTeamByTrainerId, db, invitePlayer, removePlayer, getDoc } from '../config/firebase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<MainTabParamList, 'Team'>;

interface TeamMember {
  id: string;
  name: string;
  position: string;
  role: 'staff' | 'player';
  status: 'active' | 'injured';
  number?: number;
}

interface EditPlayerDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (position: string, number: string, status: 'active' | 'injured') => void;
  initialPosition?: string;
  initialNumber?: string;
  initialStatus?: 'active' | 'injured';
}

const EditPlayerDetailsModal: React.FC<EditPlayerDetailsModalProps> = ({
  visible,
  onClose,
  onSave,
  initialPosition = '',
  initialNumber = '',
  initialStatus = 'active',
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [number, setNumber] = useState(initialNumber);
  const [status, setStatus] = useState<'active' | 'injured'>(initialStatus);

  useEffect(() => {
    if (visible) {
      setPosition(initialPosition);
      setNumber(initialNumber);
      setStatus(initialStatus);
    }
  }, [visible, initialPosition, initialNumber, initialStatus]);

  const handleSave = () => {
    onSave(position, number, status);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Player Details</Text>
          
          <Text style={styles.inputLabel}>Status</Text>
          <View style={styles.statusContainer}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === 'active' && styles.statusButtonActive,
              ]}
              onPress={() => setStatus('active')}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={status === 'active' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.statusButtonText,
                  status === 'active' && styles.statusButtonTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === 'injured' && styles.statusButtonInjured,
              ]}
              onPress={() => setStatus('injured')}
            >
              <Ionicons
                name="medical"
                size={20}
                color={status === 'injured' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.statusButtonText,
                  status === 'injured' && styles.statusButtonTextActive,
                ]}
              >
                Injured
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.inputLabel}>Position</Text>
          <TextInput
            style={styles.input}
            value={position}
            onChangeText={setPosition}
            placeholder="Enter position"
            placeholderTextColor="#666"
          />

          <Text style={styles.inputLabel}>Number</Text>
          <TextInput
            style={styles.input}
            value={number}
            onChangeText={setNumber}
            placeholder="Enter number"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonPrimary]} 
              onPress={handleSave}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface InvitePlayerModalProps {
  visible: boolean;
  onClose: () => void;
  teamId: string;
}

const InvitePlayerModal = ({ visible, onClose, teamId }: InvitePlayerModalProps) => {
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!position.trim()) {
      Alert.alert('Error', 'Please enter a position');
      return;
    }

    if (!number.trim()) {
      Alert.alert('Error', 'Please enter a jersey number');
      return;
    }

    try {
      setLoading(true);
      await invitePlayer(teamId, email.trim(), {
        position: position.trim(),
        number: number.trim()
      });
      Alert.alert('Success', 'Invitation sent successfully!');
      setEmail('');
      setPosition('');
      setNumber('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Invite Player</Text>
          
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter player's email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Position</Text>
          <TextInput
            style={styles.input}
            value={position}
            onChangeText={setPosition}
            placeholder="Enter position (e.g., Forward)"
            placeholderTextColor="#666"
          />

          <Text style={styles.inputLabel}>Jersey Number</Text>
          <TextInput
            style={styles.input}
            value={number}
            onChangeText={setNumber}
            placeholder="Enter jersey number (1-99)"
            keyboardType="numeric"
            placeholderTextColor="#666"
            maxLength={2}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonPrimary]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Send Invitation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface Styles {
  container: ViewStyle;
  loadingContainer: ViewStyle;
  noTeamContainer: ViewStyle;
  noTeamText: TextStyle;
  noTeamSubtext: TextStyle;
  header: ViewStyle;
  title: TextStyle;
  filtersWrapper: ViewStyle;
  filterButton: ViewStyle;
  filterButtonActive: ViewStyle;
  filterText: TextStyle;
  filterTextActive: TextStyle;
  membersList: ViewStyle;
  membersListContent: ViewStyle;
  memberCard: ViewStyle;
  memberInfo: ViewStyle;
  avatarContainer: ViewStyle;
  avatarText: TextStyle;
  injuryBadge: ViewStyle;
  memberDetails: ViewStyle;
  memberName: TextStyle;
  memberPosition: TextStyle;
  editButton: ViewStyle;
  headerButtons: ViewStyle;
  addPlayerButton: ViewStyle;
  addPlayerButtonText: TextStyle;
  managementButton: ViewStyle;
  errorText: TextStyle;
  createButton: ViewStyle;
  deleteButton: ViewStyle;
  buttonText: TextStyle;
  modalOverlay: ViewStyle;
  modalContent: ViewStyle;
  modalTitle: TextStyle;
  inputLabel: TextStyle;
  input: TextStyle;
  modalButtons: ViewStyle;
  modalButton: ViewStyle;
  modalButtonPrimary: ViewStyle;
  modalButtonText: TextStyle;
  statusContainer: ViewStyle;
  statusButton: ViewStyle;
  statusButtonActive: ViewStyle;
  statusButtonInjured: ViewStyle;
  statusButtonText: TextStyle;
  statusButtonTextActive: TextStyle;
  reportInjuryButton: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  noTeamContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
    gap: 16,
  },
  noTeamText: {
    fontSize: 18,
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  noTeamSubtext: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  filtersWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#2a305e',
    marginRight: 8,
    height: 36,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#e17777',
  },
  filterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    fontWeight: '600',
  },
  membersList: {
    flex: 1,
  },
  membersListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  memberCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e17777',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  injuryBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberPosition: {
    color: '#e17777',
    fontSize: 14,
    marginTop: 4,
  },
  editButton: {
    backgroundColor: '#e17777',
    padding: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addPlayerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  managementButton: {
    padding: 8,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a305e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#666',
    marginHorizontal: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  scanQRButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a305e',
  },
  statusButtonActive: {
    backgroundColor: '#4CAF50',
  },
  statusButtonInjured: {
    backgroundColor: '#f44336',
  },
  statusButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  reportInjuryButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
});

export const TeamScreen = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [allowPlayerInjuryReporting, setAllowPlayerInjuryReporting] = useState(true);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  useEffect(() => {
    loadTeamMembers();
  }, [route.params?.refresh]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setMembers([]);
        return;
      }

      // First try to get the user's data to check if they're part of a team
      const userData = await getUser(currentUser.uid);
      let userTeamId = userData?.teamId;

      // If no teamId found in user data and user is a trainer, try to find their team
      if (!userTeamId && userData?.type === 'trainer') {
        const team = await getTeamByTrainerId(currentUser.uid);
        if (team) {
          userTeamId = team.id;
          setAllowPlayerInjuryReporting(team.allowPlayerInjuryReporting);
          // Update the user's document with the team ID
          const userRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userRef, {
            teamId: team.id,
            updatedAt: serverTimestamp()
          });
        }
      } else if (userTeamId) {
        // Get team data for player
        const teamDoc = await getDoc(doc(db, 'teams', userTeamId));
        if (teamDoc.exists()) {
          setAllowPlayerInjuryReporting(teamDoc.data().allowPlayerInjuryReporting);
        }
      }

      setTeamId(userTeamId);

      if (!userTeamId) {
        setMembers([]);
        return;
      }

      const teamMembers = await getTeamMembers(userTeamId);
      setMembers(teamMembers.map(member => ({
        ...member,
        role: member.role as 'staff' | 'player',
        status: member.status as 'active' | 'injured'
      })));
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading team members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = () => {
    navigation.navigate('TeamManagement');
  };

  const handleDeleteTeam = async () => {
    if (!teamId) {
      Alert.alert('Error', 'No team found to delete');
      return;
    }

    Alert.alert(
      'Delete Team',
      'Are you sure you want to delete this team? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteTeam(teamId);
              setTeamId(null);
              setMembers([]);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEditMember = (member: TeamMember) => {
    if (member.role === 'player') {
      setEditingMember(member);
    }
  };

  const handleSavePlayerDetails = async (position: string, number: string, status: 'active' | 'injured') => {
    if (!editingMember) return;

    // If player is trying to update status but it's not allowed, show error
    if (user?.type !== 'trainer' && !allowPlayerInjuryReporting && editingMember.status !== status) {
      Alert.alert('Error', 'You are not allowed to update injury status');
      return;
    }

    // If player is trying to mark themselves as active, show error
    if (user?.type !== 'trainer' && status === 'active' && editingMember.status === 'injured') {
      Alert.alert('Error', 'Only trainers can mark players as active');
      return;
    }

    if (!position.trim()) {
      Alert.alert('Error', 'Please enter a position');
      return;
    }

    if (!number.trim()) {
      Alert.alert('Error', 'Please enter a jersey number');
      return;
    }

    // Check if number is valid
    const numberValue = parseInt(number);
    if (isNaN(numberValue) || numberValue < 1 || numberValue > 99) {
      Alert.alert('Error', 'Please enter a valid jersey number (1-99)');
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', editingMember.id), {
        position: position.trim(),
        number: numberValue,
        status,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setMembers(prev => prev.map(member => 
        member.id === editingMember.id
          ? { 
              ...member, 
              position: position.trim(),
              number: numberValue,
              status,
              updatedAt: new Date().toISOString()
            }
          : member
      ));

      setEditingMember(null);
    } catch (error) {
      console.error('Error updating player details:', error);
      Alert.alert('Error', 'Failed to update player details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlayer = (member: TeamMember) => {
    if (member.role !== 'player' || !teamId) return;

    Alert.alert(
      'Remove Player',
      `Are you sure you want to remove ${member.name} from the team? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await removePlayer(teamId, member.id);
              await loadTeamMembers(); // Refresh the team list
              Alert.alert('Success', `${member.name} has been removed from the team`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove player');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const filteredMembers = members.filter(member => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'players') return member.role === 'player';
    if (selectedFilter === 'staff') return member.role === 'staff';
    if (selectedFilter === 'injured') return member.status === 'injured';
    return true;
  });

  const renderTeamMember = (member: TeamMember) => {
    const isCurrentUser = member.id === auth.currentUser?.uid;
    const canSelfReport = isCurrentUser && 
      member.role === 'player' && 
      allowPlayerInjuryReporting;

    const handleSelfReport = async () => {
      const newStatus = member.status === 'active' ? 'injured' : 'active';
      Alert.alert(
        newStatus === 'injured' ? 'Report Injury' : 'Mark as Active',
        newStatus === 'injured' 
          ? 'Are you sure you want to report yourself as injured?' 
          : 'Are you sure you want to mark yourself as active?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            style: newStatus === 'injured' ? 'destructive' : 'default',
            onPress: async () => {
              try {
                setLoading(true);
                await updateDoc(doc(db, 'users', member.id), {
                  status: newStatus,
                  updatedAt: serverTimestamp()
                });
                
                // Update local state
                setMembers(prev => prev.map(m => 
                  m.id === member.id
                    ? { ...m, status: newStatus }
                    : m
                ));

                Alert.alert(
                  'Success', 
                  newStatus === 'injured' 
                    ? 'Your injury has been reported' 
                    : 'You have been marked as active'
                );
              } catch (error) {
                console.error('Error updating status:', error);
                Alert.alert('Error', 'Failed to update status. Please try again.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    };

    return (
      <TouchableOpacity 
        key={member.id} 
        style={styles.memberCard}
        onPress={() => user?.type === 'trainer' ? handleEditMember(member) : null}
        onLongPress={() => user?.type === 'trainer' && member.role === 'player' ? handleRemovePlayer(member) : null}
        delayLongPress={500}
        activeOpacity={user?.type === 'trainer' ? 0.7 : 1}
      >
        <View style={styles.memberInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{member.name[0]}</Text>
            {member.status === 'injured' && (
              <View style={styles.injuryBadge}>
                <Ionicons name="medical" size={12} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberPosition}>
              {member.role === 'player' ? (
                <>
                  {member.number ? `#${member.number} · ` : ''}
                  {member.position || 'Unassigned'}
                  {member.status === 'injured' ? ' · Injured' : ''}
                </>
              ) : (
                member.position
              )}
            </Text>
          </View>
          {user?.type === 'trainer' && member.role === 'player' && (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEditMember(member)}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          {canSelfReport && (
            <TouchableOpacity 
              style={[
                styles.reportInjuryButton,
                member.status === 'injured' && styles.statusButtonActive
              ]}
              onPress={handleSelfReport}
            >
              <Ionicons 
                name={member.status === 'injured' ? "checkmark-circle" : "medical"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!teamId) {
    return (
      <View style={styles.noTeamContainer}>
        <Text style={styles.noTeamText}>You don't have a team yet</Text>
        <Text style={styles.noTeamSubtext}>
          {user?.type === 'trainer'
            ? 'Create a team to start managing your players'
            : 'Join a team by scanning a QR code'}
        </Text>
        {user?.type === 'trainer' ? (
            <TouchableOpacity style={styles.createButton} onPress={handleCreateTeam}>
              <Text style={styles.buttonText}>Create Team</Text>
            </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Text style={styles.buttonText}>Scan QR Code</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const isTrainer = members.some(member => 
    member.id === auth.currentUser?.uid && member.role === 'staff'
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Team</Text>
        {user?.type === 'trainer' && (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.addPlayerButton}
              onPress={() => setShowInviteModal(true)}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.addPlayerButtonText}>Add Player</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.managementButton}
              onPress={() => navigation.navigate('TeamManagement')}
            >
              <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filters - Now visible for both players and trainers */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'players' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('players')}
          >
            <Text style={[styles.filterText, selectedFilter === 'players' && styles.filterTextActive]}>
              Players
            </Text>
          </TouchableOpacity>
          {user?.type === 'trainer' && (
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'staff' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('staff')}
          >
            <Text style={[styles.filterText, selectedFilter === 'staff' && styles.filterTextActive]}>
              Staff
            </Text>
          </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'injured' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('injured')}
          >
            <Text style={[styles.filterText, selectedFilter === 'injured' && styles.filterTextActive]}>
              Injured
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Team Members List */}
      <ScrollView 
        style={styles.membersList}
        contentContainerStyle={styles.membersListContent}
      >
        {filteredMembers.map(renderTeamMember)}
      </ScrollView>

      <EditPlayerDetailsModal
        visible={!!editingMember}
        onClose={() => setEditingMember(null)}
        onSave={handleSavePlayerDetails}
        initialPosition={editingMember?.position}
        initialNumber={editingMember?.number?.toString()}
        initialStatus={editingMember?.status}
      />

      {teamId && (
        <InvitePlayerModal
          visible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          teamId={teamId}
        />
      )}
    </SafeAreaView>
  );
};