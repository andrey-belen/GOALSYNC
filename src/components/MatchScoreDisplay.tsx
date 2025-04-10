import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface MatchScoreDisplayProps {
  score?: {
    home: number;
    away: number;
  };
  possession?: number;
  visibility?: 'public' | 'private';
  homeTeam?: string;
  awayTeam?: string;
  matchDate?: Date;
  location?: string;
}

export const MatchScoreDisplay: React.FC<MatchScoreDisplayProps> = ({
  score,
  possession,
  visibility,
  homeTeam,
  awayTeam,
  matchDate,
  location,
}) => {
  if (!score) {
    return null;
  }

  return (
    <View style={styles.container}>
      {visibility && (
        <View style={[
          styles.statusContainer, 
          visibility === 'public' ? styles.publicContainer : styles.privateContainer
        ]}>
          <Ionicons 
            name={visibility === 'public' ? 'checkmark-circle' : 'time-outline'} 
            size={24} 
            color={visibility === 'public' ? theme.colors.success : theme.colors.warning} 
          />
          <Text style={[
            styles.statusText,
            visibility === 'public' ? styles.publicText : styles.privateText
          ]}>
            {visibility === 'public' ? 'Match Statistics Released' : 'Statistics Not Yet Released'}
      </Text>
        </View>
      )}

      {/* Match details section */}
      {matchDate && (
        <View style={styles.matchDetailsContainer}>
          <View style={styles.matchDateContainer}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.matchDateText}>{format(matchDate, 'EEE, MMM d, yyyy')}</Text>
          </View>
          
          {location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color={theme.colors.text.secondary} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          )}
        </View>
      )}

      {/* Teams and Score section */}
      <View style={styles.scoreContainer}>
        <View style={styles.teamContainer}>
          <View style={styles.teamBadge}>
            <Text style={styles.teamLetter}>{homeTeam ? homeTeam.charAt(0) : 'H'}</Text>
          </View>
          <Text style={styles.teamName}>{homeTeam || 'Home Team'}</Text>
        </View>

        <View style={styles.scoreWrapper}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>{score.home}</Text>
          </View>
          <Text style={styles.scoreSeparator}>-</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>{score.away}</Text>
          </View>
        </View>

        <View style={styles.teamContainer}>
          <View style={[styles.teamBadge, styles.awayTeamBadge]}>
            <Text style={styles.teamLetter}>{awayTeam ? awayTeam.charAt(0) : 'A'}</Text>
          </View>
          <Text style={styles.teamName}>{awayTeam || 'Away Team'}</Text>
        </View>
      </View>

      {/* Possession Bar */}
      {possession !== undefined && (
        <View style={styles.possessionSection}>
          <Text style={styles.possessionTitle}>Ball Possession</Text>
          <View style={styles.possessionBarContainer}>
            <View style={styles.possessionTeam}>
              <Text style={styles.possessionValue}>{possession}%</Text>
              <Text style={styles.possessionTeamName}>{homeTeam || 'Home'}</Text>
            </View>
            
            <View style={styles.possessionBar}>
              <View style={[styles.possessionLeft, { width: `${possession}%` }]} />
              <View style={[styles.possessionRight, { width: `${100 - possession}%` }]} />
            </View>
            
            <View style={styles.possessionTeam}>
              <Text style={styles.possessionValue}>{100 - possession}%</Text>
              <Text style={styles.possessionTeamName}>{awayTeam || 'Away'}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  publicContainer: {
    backgroundColor: theme.colors.success + '20',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  privateContainer: {
    backgroundColor: theme.colors.warning + '20',
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: theme.spacing.sm,
  },
  publicText: {
    color: theme.colors.success,
  },
  privateText: {
    color: theme.colors.warning,
  },
  matchDetailsContainer: {
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  matchDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  matchDateText: {
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
    fontSize: 14,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
    fontSize: 14,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  teamContainer: {
    alignItems: 'center',
    flex: 1,
  },
  teamBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  awayTeamBadge: {
    backgroundColor: theme.colors.background,
  },
  teamLetter: {
    color: theme.colors.text.inverse,
    fontWeight: 'bold',
    fontSize: 24,
  },
  teamName: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  scoreWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  scoreBox: {
    backgroundColor: theme.colors.background,
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scoreText: {
    color: theme.colors.text.primary,
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreSeparator: {
    color: theme.colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: theme.spacing.sm,
  },
  possessionSection: {
    marginTop: theme.spacing.md,
  },
  possessionTitle: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  possessionBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  possessionTeam: {
    alignItems: 'center',
    width: 60,
  },
  possessionValue: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  possessionTeamName: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  possessionBar: {
    flex: 1,
    height: 14,
    flexDirection: 'row',
    borderRadius: 7,
    overflow: 'hidden',
    marginHorizontal: theme.spacing.md,
  },
  possessionLeft: {
    backgroundColor: theme.colors.primary,
    height: '100%',
  },
  possessionRight: {
    backgroundColor: theme.colors.background,
    height: '100%',
  },
}); 