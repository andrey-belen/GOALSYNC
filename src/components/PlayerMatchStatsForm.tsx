import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Switch } from 'react-native';
import { theme } from '../theme';
import { PlayerMatchStats } from '../types/database';

interface PlayerMatchStatsFormProps {
  matchId: string;
  playerId: string;
  onSubmit: (stats: Omit<PlayerMatchStats, 'id' | 'status' | 'submittedAt'>) => void;
  isGoalkeeper?: boolean;
}

type Stats = {
  goals: number;
  assists: number;
  shotsOnTarget: number;
  yellowCards: number;
  redCards: number;
  cleanSheet: boolean;
};

export const PlayerMatchStatsForm: React.FC<PlayerMatchStatsFormProps> = ({
  matchId,
  playerId,
  onSubmit,
  isGoalkeeper,
}) => {
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

  const handleSubmit = () => {
    onSubmit({
      matchId,
      playerId,
      stats: {
        ...stats,
        minutesPlayed: 90, // Default to full match
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Goals</Text>
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

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Assists</Text>
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
          <Text style={styles.statLabel}>Shots on Target</Text>
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
          <Text style={styles.statLabel}>Yellow Cards</Text>
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
          <Text style={styles.statLabel}>Red Cards</Text>
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

        {isGoalkeeper && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Clean Sheet</Text>
            <Switch
              value={stats.cleanSheet}
              onValueChange={(value) => setStats(prev => ({ ...prev, cleanSheet: value }))}
            />
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit Statistics</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
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
  statLabel: {
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
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 