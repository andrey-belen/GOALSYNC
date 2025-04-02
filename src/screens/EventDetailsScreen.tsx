import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { format } from 'date-fns';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetails'>;

export const EventDetailsScreen = ({ route }: Props) => {
  const { title, type, date, time, location, notes } = route.params;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'training':
        return 'fitness';
      case 'match':
        return 'football';
      case 'meeting':
        return 'people';
      default:
        return 'calendar';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'training':
        return '#4CAF50';
      case 'match':
        return '#e17777';
      case 'meeting':
        return '#2196F3';
      default:
        return '#999';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.typeIcon, { backgroundColor: getEventColor(type) }]}>
            <Ionicons name={getEventIcon(type)} size={24} color="#fff" />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.type}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar" size={20} color={theme.colors.text.secondary} />
          <Text style={styles.detailText}>
            {format(date, 'EEEE, MMMM d, yyyy')}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="time" size={20} color={theme.colors.text.secondary} />
          <Text style={styles.detailText}>
            {format(time, 'h:mm a')}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="location" size={20} color={theme.colors.text.secondary} />
          <Text style={styles.detailText}>{location}</Text>
        </View>

        {notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: '#2a305e',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
  },
  type: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  detailsContainer: {
    padding: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#2a305e',
    padding: 16,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginLeft: 12,
  },
  notesContainer: {
    backgroundColor: '#2a305e',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
}); 