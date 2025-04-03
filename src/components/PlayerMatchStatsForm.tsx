import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Switch, Alert } from 'react-native';
import { theme } from '../theme';
import { PlayerMatchStats } from '../types/database';

interface PlayerMatchStatsFormProps {
  matchId: string;
  playerId: string;
  onSubmit: (stats: Omit<PlayerMatchStats, 'id' | 'status' | 'submittedAt'>) => void;
  isGoalkeeper?: boolean;
  hideSubmitButton?: boolean;
  initialStats?: PlayerMatchStats['stats'];
}

export const PlayerMatchStatsForm: React.FC<PlayerMatchStatsFormProps> = ({
  matchId,
  playerId,
  onSubmit,
  isGoalkeeper: initialIsGoalkeeper = false,
  hideSubmitButton = false,
  initialStats,
}) => {
  const [stats, setStats] = useState<PlayerMatchStats['stats']>(initialStats || {
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

  const validateStats = (): boolean => {
    // Basic validation rules
    if (stats.goals < 0 || stats.goals > 10) {
      Alert.alert('Invalid Goals', 'Goals must be between 0 and 10');
      return false;
    }
    if (stats.assists < 0 || stats.assists > 10) {
      Alert.alert('Invalid Assists', 'Assists must be between 0 and 10');
      return false;
    }
    if (stats.shotsOnTarget < 0 || stats.shotsOnTarget > 20) {
      Alert.alert('Invalid Shots', 'Shots on target must be between 0 and 20');
      return false;
    }
    if (stats.yellowCards < 0 || stats.yellowCards > 2) {
      Alert.alert('Invalid Yellow Cards', 'Yellow cards must be between 0 and 2');
      return false;
    }
    if (stats.redCards < 0 || stats.redCards > 1) {
      Alert.alert('Invalid Red Cards', 'Red cards must be 0 or 1');
      return false;
    }
    if (stats.minutesPlayed < 0 || stats.minutesPlayed > 120) {
      Alert.alert('Invalid Minutes', 'Minutes played must be between 0 and 120');
      return false;
    }
    if (initialIsGoalkeeper) {
      if (stats.saves < 0 || stats.saves > 20) {
        Alert.alert('Invalid Saves', 'Saves must be between 0 and 20');
        return false;
      }
      if (stats.goalsConceded < 0 || stats.goalsConceded > 10) {
        Alert.alert('Invalid Goals Conceded', 'Goals conceded must be between 0 and 10');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateStats()) return;

    Alert.alert(
      'Confirm Submission',
      'Are you sure you want to submit these statistics?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: () => onSubmit({
      matchId,
      playerId,
            stats
          }),
        },
      ]
    );
  };

  const StatInput = ({ 
    label, 
    value, 
    onIncrement, 
    onDecrement,
    helpText,
    maxValue = 10,
    minValue = 0
  }: {
    label: string;
    value: number;
    onIncrement: () => void;
    onDecrement: () => void;
    helpText?: string;
    maxValue?: number;
    minValue?: number;
  }) => (
    <View style={styles.statItem}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        {helpText && (
          <Text style={styles.helpText}>{helpText}</Text>
        )}
      </View>
      <View style={styles.statInputContainer}>
        <TouchableOpacity 
          style={[styles.statButton, value <= minValue && styles.disabledButton]}
          onPress={onDecrement}
          disabled={value <= minValue}
        >
          <Text style={[styles.statButtonText, value <= minValue && styles.disabledButtonText]}>-</Text>
        </TouchableOpacity>
        <Text style={styles.statValue}>{value}</Text>
        <TouchableOpacity 
          style={[styles.statButton, value >= maxValue && styles.disabledButton]}
          onPress={onIncrement}
          disabled={value >= maxValue}
        >
          <Text style={[styles.statButtonText, value >= maxValue && styles.disabledButtonText]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.statsGrid}>
        <StatInput
          label="Goals"
          value={stats.goals}
          onIncrement={() => setStats(prev => ({ ...prev, goals: prev.goals + 1 }))}
          onDecrement={() => setStats(prev => ({ ...prev, goals: Math.max(0, prev.goals - 1) }))}
          helpText="Number of goals scored"
          maxValue={10}
        />

        <StatInput
          label="Assists"
          value={stats.assists}
          onIncrement={() => setStats(prev => ({ ...prev, assists: prev.assists + 1 }))}
          onDecrement={() => setStats(prev => ({ ...prev, assists: Math.max(0, prev.assists - 1) }))}
          helpText="Number of assists made"
          maxValue={10}
        />

        <StatInput
          label="Shots on Target"
          value={stats.shotsOnTarget}
          onIncrement={() => setStats(prev => ({ ...prev, shotsOnTarget: prev.shotsOnTarget + 1 }))}
          onDecrement={() => setStats(prev => ({ ...prev, shotsOnTarget: Math.max(0, prev.shotsOnTarget - 1) }))}
          helpText="Number of shots that were on target"
          maxValue={20}
        />

        <StatInput
          label="Yellow Cards"
          value={stats.yellowCards}
          onIncrement={() => setStats(prev => ({ ...prev, yellowCards: Math.min(2, prev.yellowCards + 1) }))}
          onDecrement={() => setStats(prev => ({ ...prev, yellowCards: Math.max(0, prev.yellowCards - 1) }))}
          helpText="Number of yellow cards received"
          maxValue={2}
        />

        <StatInput
          label="Red Cards"
          value={stats.redCards}
          onIncrement={() => setStats(prev => ({ ...prev, redCards: Math.min(1, prev.redCards + 1) }))}
          onDecrement={() => setStats(prev => ({ ...prev, redCards: Math.max(0, prev.redCards - 1) }))}
          helpText="Number of red cards received"
          maxValue={1}
        />

        {initialIsGoalkeeper && (
          <>
            <StatInput
              label="Saves"
              value={stats.saves}
              onIncrement={() => setStats(prev => ({ ...prev, saves: prev.saves + 1 }))}
              onDecrement={() => setStats(prev => ({ ...prev, saves: Math.max(0, prev.saves - 1) }))}
              helpText="Number of saves made"
              maxValue={20}
            />

            <StatInput
              label="Goals Conceded"
              value={stats.goalsConceded}
              onIncrement={() => setStats(prev => ({ ...prev, goalsConceded: prev.goalsConceded + 1 }))}
              onDecrement={() => setStats(prev => ({ ...prev, goalsConceded: Math.max(0, prev.goalsConceded - 1) }))}
              helpText="Number of goals conceded"
              maxValue={10}
            />

            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Clean Sheet</Text>
                <Text style={styles.helpText}>Did not concede any goals</Text>
              </View>
              <Switch
                value={stats.cleanSheet}
                onValueChange={(value) => setStats(prev => ({ ...prev, cleanSheet: value }))}
              />
            </View>
          </>
        )}
      </View>

      {!hideSubmitButton && (
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Statistics</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  statsGrid: {
    gap: 12,
  },
  statItem: {
    backgroundColor: theme.colors.card,
    padding: 12,
    borderRadius: 6,
  },
  statHeader: {
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  statInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
  },
  statButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: theme.colors.text.secondary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginHorizontal: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 