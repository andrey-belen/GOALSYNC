import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PlayerAttendanceCardProps {
  attendance: {
    present: number;
    total: number;
  };
  percentage: number;
}

export const PlayerAttendanceCard = ({ attendance, percentage }: PlayerAttendanceCardProps) => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 55) / 2; // Half screen width minus margins and gap
  const size = cardWidth * 0.65; // Circle size relative to card width
  const strokeWidth = size * 0.08; // Proportional stroke width
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (percentage / 100) * circumference;

  const getAttendanceColor = (percentage: number): string => {
    if (percentage >= 90) return theme.colors.success;
    if (percentage >= 75) return '#E17777';
    return '#FF5252';
  };

  const handlePress = () => {
    navigation.navigate('PlayerAttendanceHistory', {
      userId: user!.id,
      userName: user!.name,
      stats: {
        teamId: user!.teamId!,
        attendance,
        percentage
      }
    });
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { width: cardWidth }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
      </View>
      <View style={styles.separator} />
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <Svg width={size} height={size} style={styles.svg}>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(225, 119, 119, 0.2)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#E17777"
              strokeWidth={strokeWidth}
              strokeDasharray={`${progress} ${circumference}`}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={styles.percentageContainer}>
            <Text style={styles.percentage}>{percentage}<Text style={styles.percentSymbol}>%</Text></Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    backgroundColor: 'transparent',
  },
  percentageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: '400',
  },
  attendanceDetails: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
}); 