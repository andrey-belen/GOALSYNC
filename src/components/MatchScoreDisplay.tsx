import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface MatchScoreDisplayProps {
  score?: {
    home: number;
    away: number;
  };
  possession?: number;
}

export const MatchScoreDisplay: React.FC<MatchScoreDisplayProps> = ({
  score,
  possession,
}) => {
  if (!score) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>
        {score.home} - {score.away}
      </Text>
      {possession !== undefined && (
        <Text style={styles.possessionText}>
          Ball Possession: {possession}%
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  possessionText: {
    fontSize: 18,
    color: theme.colors.text.secondary,
  },
}); 