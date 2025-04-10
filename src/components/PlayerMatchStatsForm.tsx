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
    maxValue = 10,
    minValue = 0
  }: {
    label: string;
    value: number;
    onIncrement: () => void;
    onDecrement: () => void;
    maxValue?: number;
    minValue?: number;
  }) => (
    <View style={styles.statItem}>
        <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statInputContainer}>
        <View style={styles.statButtonColumn}>
          <TouchableOpacity 
            style={[styles.smallStatButton, value >= maxValue && styles.disabledButton]}
            onPress={onIncrement}
            disabled={value >= maxValue}
          >
            <Text style={[styles.smallStatButtonText, value >= maxValue && styles.disabledButtonText]}>+</Text>
          </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.smallStatButton, value <= minValue && styles.disabledButton]}
          onPress={onDecrement}
          disabled={value <= minValue}
        >
            <Text style={[styles.smallStatButtonText, value <= minValue && styles.disabledButtonText]}>-</Text>
        </TouchableOpacity>
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  // Custom component for Minutes Played with direct input
  const MinutesPlayedInput = () => (
    <View style={styles.minutesContainer}>
      <Text style={styles.statLabel}>Minutes Played</Text>
      <TextInput
        style={styles.minutesInput}
        value={stats.minutesPlayed.toString()}
        onChangeText={(value) => {
          const minutes = parseInt(value) || 0;
          if (minutes >= 0 && minutes <= 120) {
            setStats(prev => ({ ...prev, minutesPlayed: minutes }));
          }
        }}
        keyboardType="number-pad"
        maxLength={3}
        placeholder="0-120"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Minutes played at the top with direct input */}
      <MinutesPlayedInput />
      
      {/* Make the rest of the stats more compact with multi-column layout */}
      <View style={styles.compactStatsGrid}>
        <View style={styles.statsColumn}>
        <StatInput
          label="Goals"
          value={stats.goals}
          onIncrement={() => setStats(prev => ({ ...prev, goals: prev.goals + 1 }))}
          onDecrement={() => setStats(prev => ({ ...prev, goals: Math.max(0, prev.goals - 1) }))}
          maxValue={10}
        />
        <StatInput
          label="Assists"
          value={stats.assists}
          onIncrement={() => setStats(prev => ({ ...prev, assists: prev.assists + 1 }))}
          onDecrement={() => setStats(prev => ({ ...prev, assists: Math.max(0, prev.assists - 1) }))}
          maxValue={10}
        />
          <StatInput
            label="Yellow Cards"
            value={stats.yellowCards}
            onIncrement={() => setStats(prev => ({ ...prev, yellowCards: Math.min(2, prev.yellowCards + 1) }))}
            onDecrement={() => setStats(prev => ({ ...prev, yellowCards: Math.max(0, prev.yellowCards - 1) }))}
            maxValue={2}
          />
        </View>
        
        <View style={styles.statsColumn}>
        <StatInput
          label="Shots on Target"
          value={stats.shotsOnTarget}
          onIncrement={() => setStats(prev => ({ ...prev, shotsOnTarget: prev.shotsOnTarget + 1 }))}
          onDecrement={() => setStats(prev => ({ ...prev, shotsOnTarget: Math.max(0, prev.shotsOnTarget - 1) }))}
          maxValue={20}
        />
        <StatInput
          label="Red Cards"
          value={stats.redCards}
          onIncrement={() => setStats(prev => ({ ...prev, redCards: Math.min(1, prev.redCards + 1) }))}
          onDecrement={() => setStats(prev => ({ ...prev, redCards: Math.max(0, prev.redCards - 1) }))}
          maxValue={1}
        />

          {/* Show goalkeeper-specific stats in the second column */}
        {initialIsGoalkeeper && (
            <StatInput
              label="Goals Conceded"
              value={stats.goalsConceded}
              onIncrement={() => setStats(prev => ({ ...prev, goalsConceded: prev.goalsConceded + 1 }))}
              onDecrement={() => setStats(prev => ({ ...prev, goalsConceded: Math.max(0, prev.goalsConceded - 1) }))}
              maxValue={10}
            />
          )}
        </View>
      </View>
      
      {/* Goalkeeper-specific stats */}
      {initialIsGoalkeeper && (
        <View style={styles.goalieStats}>
          <StatInput
            label="Saves"
            value={stats.saves}
            onIncrement={() => setStats(prev => ({ ...prev, saves: prev.saves + 1 }))}
            onDecrement={() => setStats(prev => ({ ...prev, saves: Math.max(0, prev.saves - 1) }))}
            maxValue={20}
          />
          <View style={styles.cleanSheetContainer}>
                <Text style={styles.statLabel}>Clean Sheet</Text>
              <Switch
                value={stats.cleanSheet}
                onValueChange={(value) => setStats(prev => ({ ...prev, cleanSheet: value }))}
              />
            </View>
        </View>
        )}

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
    padding: 10,
  },
  compactStatsGrid: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  statsColumn: {
    flex: 1,
    gap: 8,
  },
  goalieStats: {
    marginTop: 10,
    gap: 8,
  },
  statItem: {
    backgroundColor: theme.colors.card,
    padding: 10,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  statInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statButtonColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  smallStatButton: {
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.5,
  },
  smallStatButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  disabledButtonText: {
    color: theme.colors.text.secondary,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    width: '50%',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  minutesContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  minutesInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    textAlign: 'center',
    width: '45%',
  },
  cleanSheetContainer: {
    backgroundColor: theme.colors.card,
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}); 