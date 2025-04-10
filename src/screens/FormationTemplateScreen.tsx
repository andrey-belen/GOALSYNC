import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FormationTemplate'>;

interface Formation {
  id: string;
  name: string;
  description: string;
  positions: {
    DEF: number;
    MID: number;
    FWD: number;
  };
}

const formations: Formation[] = [
  { 
    id: '4-4-2', 
    name: '4-4-2 Classic',
    description: '4 Defenders, 4 Midfielders, 2 Forwards',
    positions: {
      DEF: 4,
      MID: 4,
      FWD: 2
    }
  },
  { 
    id: '4-3-3', 
    name: '4-3-3 Attack',
    description: '4 Defenders, 3 Midfielders, 3 Forwards',
    positions: {
      DEF: 4,
      MID: 3,
      FWD: 3
    }
  },
  { 
    id: '4-2-3-1', 
    name: '4-2-3-1 Defensive',
    description: '4 Defenders, 2 DM, 3 AM, 1 Forward',
    positions: {
      DEF: 4,
      MID: 5,
      FWD: 1
    }
  },
  { 
    id: '3-5-2', 
    name: '3-5-2 Wing Play',
    description: '3 Defenders, 5 Midfielders, 2 Forwards',
    positions: {
      DEF: 3,
      MID: 5,
      FWD: 2
    }
  },
  { 
    id: '5-3-2', 
    name: '5-3-2 Counter',
    description: '5 Defenders, 3 Midfielders, 2 Forwards',
    positions: {
      DEF: 5,
      MID: 3,
      FWD: 2
    }
  }
];

export const FormationTemplateScreen = ({ route, navigation }: Props) => {
  const { onFormationSelect } = route.params;

  const handleFormationSelect = (formation: Formation) => {
    onFormationSelect(formation.id);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.formationList}>
        {formations.map((formation) => (
          <TouchableOpacity
            key={formation.id}
            style={styles.formationCard}
            onPress={() => handleFormationSelect(formation)}
          >
            <View style={styles.formationHeader}>
              <Text style={styles.formationName}>{formation.name}</Text>
              <Text style={styles.formationId}>{formation.id}</Text>
            </View>
            <Text style={styles.formationDescription}>{formation.description}</Text>
            <View style={styles.positionBreakdown}>
              <View style={styles.positionItem}>
                <Text style={styles.positionCount}>{formation.positions.DEF}</Text>
                <Text style={styles.positionLabel}>DEF</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={styles.positionCount}>{formation.positions.MID}</Text>
                <Text style={styles.positionLabel}>MID</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={styles.positionCount}>{formation.positions.FWD}</Text>
                <Text style={styles.positionLabel}>FWD</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  formationList: {
    flex: 1,
  },
  formationCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formationName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  formationId: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  formationDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 16,
  },
  positionBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1f3d',
    borderRadius: 8,
    padding: 12,
  },
  positionItem: {
    alignItems: 'center',
  },
  positionCount: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  positionLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
}); 