import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

// Mock data - replace with real data later
const performanceData = {
  wins: 12,
  draws: 3,
  losses: 5,
  goalsScored: 38,
  goalsConceded: 22,
  cleanSheets: 8,
  averageAttendance: 85,
};

const topScorers = [
  { id: '1', name: 'John Smith', goals: 12, assists: 8 },
  { id: '2', name: 'Mike Johnson', goals: 9, assists: 5 },
  { id: '3', name: 'Robert Davis', goals: 7, assists: 4 },
];

const recentResults = [
  { id: '1', opponent: 'United FC', result: 'W', score: '3-1', date: '2024-03-15' },
  { id: '2', opponent: 'City FC', result: 'D', score: '2-2', date: '2024-03-08' },
  { id: '3', opponent: 'Athletic FC', result: 'W', score: '2-0', date: '2024-03-01' },
  { id: '4', opponent: 'Rovers FC', result: 'L', score: '1-2', date: '2024-02-23' },
];

type ReportSection = 'overview' | 'players' | 'matches';

export const ReportsScreen = ({ navigation }: Props) => {
  const [activeSection, setActiveSection] = useState<ReportSection>('overview');

  const renderOverview = () => (
    <View style={styles.section}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{performanceData.wins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{performanceData.draws}</Text>
          <Text style={styles.statLabel}>Draws</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{performanceData.losses}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{performanceData.goalsScored}</Text>
          <Text style={styles.statLabel}>Goals For</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{performanceData.goalsConceded}</Text>
          <Text style={styles.statLabel}>Goals Against</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{performanceData.cleanSheets}</Text>
          <Text style={styles.statLabel}>Clean Sheets</Text>
        </View>
      </View>

      <View style={styles.winRateContainer}>
        <Text style={styles.winRateLabel}>Win Rate</Text>
        <Text style={styles.winRateNumber}>
          {Math.round((performanceData.wins / (performanceData.wins + performanceData.draws + performanceData.losses)) * 100)}%
        </Text>
      </View>
    </View>
  );

  const renderPlayers = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Top Performers</Text>
      {topScorers.map(player => (
        <View key={player.id} style={styles.playerCard}>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{player.name}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{player.goals}</Text>
              <Text style={styles.statType}>Goals</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{player.assists}</Text>
              <Text style={styles.statType}>Assists</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{player.goals + player.assists}</Text>
              <Text style={styles.statType}>Total</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderMatches = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Results</Text>
      {recentResults.map(match => (
        <View key={match.id} style={styles.matchCard}>
          <View style={styles.matchInfo}>
            <Text style={styles.matchDate}>{match.date}</Text>
            <Text style={styles.matchOpponent}>{match.opponent}</Text>
          </View>
          <View style={[
            styles.resultBadge,
            match.result === 'W' ? styles.winBadge :
            match.result === 'D' ? styles.drawBadge :
            styles.lossBadge
          ]}>
            <Text style={styles.resultText}>{match.score}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'overview' && styles.activeTab]}
          onPress={() => setActiveSection('overview')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeSection === 'overview' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[
            styles.tabText,
            activeSection === 'overview' && styles.activeTabText
          ]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'players' && styles.activeTab]}
          onPress={() => setActiveSection('players')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeSection === 'players' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[
            styles.tabText,
            activeSection === 'players' && styles.activeTabText
          ]}>Players</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'matches' && styles.activeTab]}
          onPress={() => setActiveSection('matches')}
        >
          <Ionicons
            name="football"
            size={20}
            color={activeSection === 'matches' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[
            styles.tabText,
            activeSection === 'matches' && styles.activeTabText
          ]}>Matches</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'players' && renderPlayers()}
        {activeSection === 'matches' && renderMatches()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a305e',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    borderRadius: 8,
  },
  tabText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  winRateContainer: {
    marginTop: 20,
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  winRateLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  winRateNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  playerCard: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  playerInfo: {
    marginBottom: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statType: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchDate: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  matchOpponent: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  winBadge: {
    backgroundColor: '#4CAF50',
  },
  drawBadge: {
    backgroundColor: '#FF9800',
  },
  lossBadge: {
    backgroundColor: '#F44336',
  },
  resultText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 