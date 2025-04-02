import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectPlayers'>;

interface Player {
  id: string;
  name: string;
  number: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
}

interface SelectedPlayer extends Player {
  isStarter: boolean;
  fieldPosition?: string;
}

// Mock data - replace with actual data from your backend
const mockPlayers: Player[] = [
  { id: '1', name: 'John Smith', number: 1, position: 'GK' },
  { id: '2', name: 'Mike Johnson', number: 4, position: 'DEF' },
  { id: '3', name: 'David Williams', number: 5, position: 'DEF' },
  { id: '4', name: 'James Brown', number: 6, position: 'DEF' },
  { id: '5', name: 'Robert Davis', number: 2, position: 'DEF' },
  { id: '6', name: 'Michael Wilson', number: 8, position: 'MID' },
  { id: '7', name: 'Daniel Taylor', number: 10, position: 'MID' },
  { id: '8', name: 'Christopher Anderson', number: 14, position: 'MID' },
  { id: '9', name: 'Joseph Martinez', number: 7, position: 'FWD' },
  { id: '10', name: 'Thomas Garcia', number: 9, position: 'FWD' },
  { id: '11', name: 'Ryan Rodriguez', number: 11, position: 'FWD' },
  // Substitutes
  { id: '12', name: 'Kevin Lee', number: 13, position: 'GK' },
  { id: '13', name: 'Steven White', number: 3, position: 'DEF' },
  { id: '14', name: 'Brian Moore', number: 15, position: 'MID' },
  { id: '15', name: 'Anthony King', number: 16, position: 'FWD' },
];

export const SelectPlayersScreen = ({ route, navigation }: Props) => {
  const { formation, onSelect } = route.params;
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [activeTab, setActiveTab] = useState<'GK' | 'DEF' | 'MID' | 'FWD'>('GK');

  const getRequiredPositions = (formation: string) => {
    const [def, mid, fwd] = formation.split('-').map(Number);
    return {
      GK: 1,
      DEF: def,
      MID: mid,
      FWD: fwd,
    };
  };

  const requiredPositions = getRequiredPositions(formation);

  const getSelectedCountByPosition = (position: 'GK' | 'DEF' | 'MID' | 'FWD') => {
    return selectedPlayers.filter(p => p.position === position && p.isStarter).length;
  };

  const handlePlayerSelect = (player: Player, isStarter: boolean) => {
    const isAlreadySelected = selectedPlayers.some(p => p.id === player.id);
    
    if (isAlreadySelected) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
      return;
    }

    if (isStarter) {
      const currentCount = getSelectedCountByPosition(player.position);
      if (currentCount >= requiredPositions[player.position]) {
        Alert.alert(
          'Position Full',
          `You already have ${requiredPositions[player.position]} ${player.position} players selected as starters.`
        );
        return;
      }
    }

    setSelectedPlayers([
      ...selectedPlayers,
      { ...player, isStarter }
    ]);
  };

  const handleConfirm = () => {
    // Validate selection
    const starterCount = selectedPlayers.filter(p => p.isStarter).length;
    const requiredTotal = Object.values(requiredPositions).reduce((a, b) => a + b, 0);
    
    if (starterCount !== requiredTotal) {
      Alert.alert(
        'Invalid Selection',
        `You need exactly ${requiredTotal} starters for ${formation} formation.`
      );
      return;
    }

    if (selectedPlayers.filter(p => !p.isStarter).length < 5) {
      Alert.alert(
        'Invalid Selection',
        'Please select at least 5 substitute players.'
      );
      return;
    }

    // Navigate to formation setup
    navigation.navigate('FormationSetup', {
      formation,
      players: selectedPlayers,
      onComplete: (playersWithPositions) => {
        onSelect(playersWithPositions);
        navigation.goBack();
      },
    });
  };

  const renderPlayerList = (position: 'GK' | 'DEF' | 'MID' | 'FWD') => {
    const positionPlayers = mockPlayers.filter(p => p.position === position);
    
    return (
      <ScrollView style={styles.playerList}>
        {positionPlayers.map(player => {
          const isSelected = selectedPlayers.some(p => p.id === player.id);
          const selectedPlayer = selectedPlayers.find(p => p.id === player.id);

          return (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerNumber}>#{player.number}</Text>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerPosition}>{player.position}</Text>
              </View>
              <View style={styles.selectionButtons}>
                <TouchableOpacity
                  style={[
                    styles.selectionButton,
                    isSelected && selectedPlayer?.isStarter && styles.selectionButtonActive
                  ]}
                  onPress={() => handlePlayerSelect(player, true)}
                >
                  <Text style={styles.selectionButtonText}>Starter</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.selectionButton,
                    isSelected && !selectedPlayer?.isStarter && styles.selectionButtonActive
                  ]}
                  onPress={() => handlePlayerSelect(player, false)}
                >
                  <Text style={styles.selectionButtonText}>Sub</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Players ({formation})</Text>
        <Text style={styles.subtitle}>
          Starters needed: GK: {requiredPositions.GK - getSelectedCountByPosition('GK')}, 
          DEF: {requiredPositions.DEF - getSelectedCountByPosition('DEF')}, 
          MID: {requiredPositions.MID - getSelectedCountByPosition('MID')}, 
          FWD: {requiredPositions.FWD - getSelectedCountByPosition('FWD')}
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'GK' && styles.activeTab]}
          onPress={() => setActiveTab('GK')}
        >
          <Text style={styles.tabText}>GK</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'DEF' && styles.activeTab]}
          onPress={() => setActiveTab('DEF')}
        >
          <Text style={styles.tabText}>DEF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'MID' && styles.activeTab]}
          onPress={() => setActiveTab('MID')}
        >
          <Text style={styles.tabText}>MID</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'FWD' && styles.activeTab]}
          onPress={() => setActiveTab('FWD')}
        >
          <Text style={styles.tabText}>FWD</Text>
        </TouchableOpacity>
      </View>

      {renderPlayerList(activeTab)}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Set Formation</Text>
        </TouchableOpacity>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a305e',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  tabs: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#2a305e',
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
  },
  tabText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  playerList: {
    flex: 1,
    padding: 12,
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  playerName: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  playerPosition: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  selectionButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  selectionButtonText: {
    color: theme.colors.text.primary,
    fontSize: 14,
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
});

export default SelectPlayersScreen; 