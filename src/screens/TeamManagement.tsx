import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { createTeam, getTeamByTrainerId, deleteTeam, updateTeamName, updateTeamSettings } from '../config/firebase';
import { Team } from '../types/database';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../types/navigation';

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

export const TeamManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [team, setTeam] = useState<Team | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [allowPlayerInjuryReporting, setAllowPlayerInjuryReporting] = useState(true);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    if (user?.id) {
      loadTeamData();
    }
  }, [user]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const teamData = await getTeamByTrainerId(user!.id);
      setTeam(teamData);
      if (teamData) {
        setTeamName(teamData.name);
        setAllowPlayerInjuryReporting(teamData.allowPlayerInjuryReporting ?? true);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    try {
      setLoading(true);
      const teamData = {
        name: teamName.trim(),
        players: [],
        trainerId: user!.id
      };
      
      await createTeam(teamData);
      Alert.alert('Success', 'Team created successfully!');
      await loadTeamData();
    } catch (error: any) {
      console.error('Team creation error:', error);
      Alert.alert('Error', error.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeamName = async () => {
    if (!team?.id || !teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    try {
      setLoading(true);
      await updateTeamName(team.id, teamName.trim());
      Alert.alert('Success', 'Team name updated successfully!');
      await loadTeamData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update team name');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!team?.id) {
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
              await deleteTeam(team.id);
              setTeam(null);
              navigation.navigate('MainTabs', {
                screen: 'Team',
                params: { refresh: Date.now() }
              });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete team');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleShowQRCode = () => {
    if (!team) return;
    setShowQRCode(true);
  };

  const handleToggleInjuryReporting = async () => {
    if (!team) return;

    try {
      setLoading(true);
      await updateTeamSettings(team.id, {
        allowPlayerInjuryReporting: !allowPlayerInjuryReporting
      });
      setAllowPlayerInjuryReporting(!allowPlayerInjuryReporting);
      Alert.alert(
        'Success',
        `Players can ${!allowPlayerInjuryReporting ? 'now' : 'no longer'} report injuries themselves`
      );
    } catch (error: any) {
      console.error('Error updating injury reporting setting:', error);
      Alert.alert('Error', error.message || 'Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  const QRCodeModal = () => {
    if (!team) return null;

    const qrData = JSON.stringify({
      teamId: team.id,
      teamName: team.name,
    });

    return (
      <Modal
        visible={showQRCode}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQRCode(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Team QR Code</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={qrData}
                size={200}
                backgroundColor="white"
                color="black"
              />
            </View>
            <Text style={styles.qrInstructions}>
              Show this QR code to players who want to join your team
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowQRCode(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    <ScrollView style={styles.container}>
      <QRCodeModal />
      <View style={styles.header}>
        <Text style={styles.title}>Team Settings</Text>
      </View>

      {!team ? (
        // Create Team Section
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create New Team</Text>
          <TextInput
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Enter team name"
            placeholderTextColor="#666"
          />
          <TouchableOpacity 
            style={styles.button}
            onPress={handleCreateTeam}
          >
            <Text style={styles.buttonText}>Create Team</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Team Settings Section
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Properties</Text>
            <TextInput
              style={styles.input}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Team name"
              placeholderTextColor="#666"
            />
            <TouchableOpacity 
              style={styles.button}
              onPress={handleUpdateTeamName}
            >
              <Text style={styles.buttonText}>Update Team Name</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Joining</Text>
            <TouchableOpacity 
              style={[styles.button, styles.qrButton]}
              onPress={handleShowQRCode}
            >
              <Ionicons name="qr-code" size={24} color="#fff" style={styles.qrIcon} />
              <Text style={styles.buttonText}>Show Team QR Code</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Settings</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Player Injury Self-Reporting</Text>
                <Text style={styles.settingDescription}>
                  Allow players to mark themselves as injured
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  allowPlayerInjuryReporting && styles.toggleButtonActive
                ]}
                onPress={handleToggleInjuryReporting}
              >
                <View style={[
                  styles.toggleKnob,
                  allowPlayerInjuryReporting && styles.toggleKnobActive
                ]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDeleteTeam}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Team</Text>
            </TouchableOpacity>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
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
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#2a305e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#e63946',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrIcon: {
    marginRight: 8,
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
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
  },
  qrInstructions: {
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsSection: {
    marginTop: 24,
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#999',
  },
  toggleButton: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#666',
    padding: 2,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleKnob: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#fff',
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
}); 