import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme';

interface PlayerPositionCardProps {
  position?: 'GK' | 'DEF' | 'MID' | 'FWD' | 'ST' | null;
}

export const PlayerPositionCard = ({ position }: PlayerPositionCardProps) => {
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 55) / 2; // Half screen width minus margins and gap

  return (
    <View style={[styles.container, { width: cardWidth }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Position</Text>
      </View>
      <View style={styles.separator} />
      <View style={styles.content}>
        <Text style={styles.position}>{position || '-'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a305e',
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  position: {
    fontSize: 48,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
}); 