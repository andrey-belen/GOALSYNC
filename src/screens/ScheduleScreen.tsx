import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createEvent, auth, getUser, getTeamMembers } from '../config/firebase';
import { Timestamp } from 'firebase/firestore';
import { SelectedPlayer } from '../types/formation';
import { useAuth } from '../contexts/AuthContext';
import { TeamMember } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Schedule'>;

type EventType = 'match' | 'training' | 'meeting';

// Keep formations as they are configuration data, not mock data
const formations = [
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
] as const;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EventDetails {
  title: string;
  description: string;
  type: EventType;
  startTime: Date;
  endTime: Date;
  location: string;
  isHomeGame?: boolean;
  opponent?: string;
  formation?: string;
  roster?: {
    id: string;
    name: string;
    number: string;
    position: string;
    isStarter: boolean;
    fieldPosition?: string;
  }[];
  isOutdoor?: boolean;
  isAttendanceRequired?: boolean;
}

const initialEventDetails: EventDetails = {
  title: '',
  type: 'training',
  startTime: new Date(),
  endTime: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour from now
  location: '',
  description: '',
  isOutdoor: true,
  isAttendanceRequired: true,
  opponent: '',
  isHomeGame: true,
  formation: formations[0].id, // Set default formation
  roster: [],
};

export const ScheduleScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    type: 'match',
    title: '',
    startTime: new Date(),
    endTime: new Date(),
    location: '',
    description: '',
    formation: '',
    roster: [],
    opponent: '',
    isHomeGame: true,
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [currentEditingDate, setCurrentEditingDate] = useState<'start' | 'end'>('start');
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    loadTeamId();
    loadTeamMembers();
  }, []);

  const loadTeamId = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userData = await getUser(currentUser.uid);
      if (userData?.teamId) {
        setTeamId(userData.teamId);
      }
    } catch (error) {
      console.error('Error loading team ID:', error);
    }
  };

  const loadTeamMembers = async () => {
    if (!user?.teamId) return;
    
    try {
      setLoading(true);
      const members = await getTeamMembers(user.teamId) as TeamMember[];
      setTeamMembers(members);
    } catch (error: any) {
      console.error('Error loading team members:', error);
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleEventTypeChange = (newType: EventType) => {
    console.log('Changing event type to:', newType);
    const newDetails = {
      ...eventDetails,
      type: newType,
      ...(newType === 'match' ? {
        opponent: '',
        isHomeGame: true,
        formation: formations[0].id,
        roster: [],
      } : {
        opponent: undefined,
        isHomeGame: undefined,
        formation: undefined,
        roster: undefined,
      })
    };
    console.log('Setting new event details:', newDetails);
    setEventDetails(newDetails);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!eventDetails.title.trim()) {
        Alert.alert('Error', 'Please enter an event title');
        return;
      }
      if (!eventDetails.location.trim()) {
        Alert.alert('Error', 'Please enter an event location');
        return;
      }
      if (eventDetails.endTime <= eventDetails.startTime) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }

      // Match-specific validations
      if (eventDetails.type === 'match') {
        if (!eventDetails.opponent?.trim()) {
          Alert.alert('Error', 'Please enter an opponent team name');
          return;
        }
        if (!eventDetails.formation) {
          Alert.alert('Error', 'Please select a formation');
          return;
        }
        if (!eventDetails.roster?.length) {
          Alert.alert('Error', 'Please assign players to positions');
          return;
        }
        // Get the required number of players for the selected formation
        const selectedFormation = formations.find(f => f.id === eventDetails.formation);
        if (selectedFormation) {
          const requiredPlayers = Object.values(selectedFormation.positions).reduce((sum, count) => sum + count, 0);
          if (eventDetails.roster.length < requiredPlayers) {
            Alert.alert('Error', `Please assign all ${requiredPlayers} positions in the ${eventDetails.formation} formation`);
            return;
          }
        }
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create events');
        return;
      }

      const userData = await getUser(currentUser.uid);
      if (!userData?.teamId) {
        Alert.alert('Error', 'You must be part of a team to create events');
        return;
      }

      // Create event in Firebase
      await createEvent({
        teamId: userData.teamId,
        title: eventDetails.title.trim(),
        type: eventDetails.type,
        startTime: Timestamp.fromDate(eventDetails.startTime),
        endTime: Timestamp.fromDate(eventDetails.endTime),
        location: eventDetails.location.trim(),
        description: eventDetails.description?.trim() || '',
        isOutdoor: eventDetails.isOutdoor ?? false,
        isAttendanceRequired: eventDetails.isAttendanceRequired ?? true,
        createdBy: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...(eventDetails.type === 'match' ? {
          opponent: eventDetails.opponent?.trim() || '',
          isHomeGame: eventDetails.isHomeGame ?? false,
          formation: eventDetails.formation || '',
          roster: (eventDetails.roster || []).map(player => ({
            id: player.id,
            name: player.name,
            number: player.number.toString(),
            position: player.position,
            isStarter: player.isStarter ?? false,
            fieldPosition: player.fieldPosition || '',
            status: player.status || 'active'
          }))
        } : {
          opponent: '',
          isHomeGame: false,
          formation: '',
          roster: []
        }),
        attendees: [],
        absentees: []
      });

      Alert.alert(
        'Success',
        'Event created successfully',
        [{ 
          text: 'OK', 
          onPress: () => {
            // Reset navigation stack and go to MainTabs
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'MainTabs',
                  params: { screen: 'Calendar' }
                },
              ],
            });
          }
        }]
      );
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    
    if (selectedDate) {
      if (datePickerMode === 'date') {
        // Keep the time from the current startTime but update the date
        const newDate = new Date(selectedDate);
        const currentTime = eventDetails.startTime;
        newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
        
        setEventDetails(prev => ({
          ...prev,
          startTime: newDate,
          endTime: new Date(newDate.getTime() + 60 * 60 * 1000),
        }));
        
        // Switch to time picker after setting date
        setDatePickerMode('time');
      } else {
        // Update the time
        const newTime = new Date(eventDetails.startTime);
        newTime.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        
        setEventDetails(prev => ({
          ...prev,
          startTime: newTime,
          endTime: new Date(newTime.getTime() + 60 * 60 * 1000),
        }));
        
        // Close picker after setting time
        setShowStartPicker(false);
        setDatePickerMode('date');
      }
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    
    if (selectedDate) {
      if (datePickerMode === 'date') {
        // Keep the time from the current endTime but update the date
        const newDate = new Date(selectedDate);
        const currentTime = eventDetails.endTime;
        newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
        
        setEventDetails(prev => ({ ...prev, endTime: newDate }));
        
        // Switch to time picker after setting date
        setDatePickerMode('time');
      } else {
        // Update the time
        const newTime = new Date(eventDetails.endTime);
        newTime.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        
        setEventDetails(prev => ({ ...prev, endTime: newTime }));
        
        // Close picker after setting time
        setShowEndPicker(false);
        setDatePickerMode('date');
      }
    }
  };

  const openStartDatePicker = () => {
    setCurrentEditingDate('start');
    setDatePickerMode('date');
    setShowStartPicker(true);
  };

  const openEndDatePicker = () => {
    setCurrentEditingDate('end');
    setDatePickerMode('date');
    setShowEndPicker(true);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Date/Time Picker Modal for iOS */}
      {Platform.OS === 'ios' && (showStartPicker || showEndPicker) && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showStartPicker || showEndPicker}
          onRequestClose={() => {
            setShowStartPicker(false);
            setShowEndPicker(false);
            setDatePickerMode('date');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {currentEditingDate === 'start' ? 'Set Start' : 'Set End'} {datePickerMode === 'date' ? 'Date' : 'Time'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowStartPicker(false);
                    setShowEndPicker(false);
                    setDatePickerMode('date');
                  }}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={currentEditingDate === 'start' ? eventDetails.startTime : eventDetails.endTime}
                mode={datePickerMode}
                display="spinner"
                onChange={currentEditingDate === 'start' ? handleStartTimeChange : handleEndTimeChange}
                textColor="#fff"
                style={styles.dateTimePicker}
              />
              
              <View style={styles.modalButtons}>
                {datePickerMode === 'date' ? (
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setDatePickerMode('time')}
                  >
                    <Text style={styles.modalButtonText}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      setShowStartPicker(false);
                      setShowEndPicker(false);
                      setDatePickerMode('date');
                    }}
                  >
                    <Text style={styles.modalButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      <View style={styles.screenContainer}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>New Event</Text>
            <View style={styles.placeholderView} />
          </View>

          {/* Basic fields for all event types */}
          <View style={styles.formSection}>
            <TextInput
              style={styles.input}
              placeholder="Event Title"
              placeholderTextColor="#666"
              value={eventDetails.title}
              onChangeText={title => setEventDetails(prev => ({ ...prev, title }))}
            />

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  eventDetails.type === 'training' && styles.typeButtonSelected,
                ]}
                onPress={() => handleEventTypeChange('training')}
              >
                <Ionicons 
                  name="fitness" 
                  size={20} 
                  color={eventDetails.type === 'training' ? '#fff' : '#666'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  eventDetails.type === 'training' && styles.typeButtonTextSelected,
                ]}>Training</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  eventDetails.type === 'match' && styles.typeButtonSelected,
                ]}
                onPress={() => handleEventTypeChange('match')}
              >
                <Ionicons 
                  name="football" 
                  size={20} 
                  color={eventDetails.type === 'match' ? '#fff' : '#666'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  eventDetails.type === 'match' && styles.typeButtonTextSelected,
                ]}>Match</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  eventDetails.type === 'meeting' && styles.typeButtonSelected,
                ]}
                onPress={() => handleEventTypeChange('meeting')}
              >
                <Ionicons 
                  name="people" 
                  size={20} 
                  color={eventDetails.type === 'meeting' ? '#fff' : '#666'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  eventDetails.type === 'meeting' && styles.typeButtonTextSelected,
                ]}>Meeting</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={openStartDatePicker}
            >
              <View style={styles.dateTimeContent}>
                <Text style={styles.dateTimeLabel}>Start Time</Text>
                <Text style={styles.dateTimeText}>
                  {formatDate(eventDetails.startTime)}
                </Text>
                <Text style={styles.dateTimeText}>
                  {formatTime(eventDetails.startTime)}
                </Text>
              </View>
              <Ionicons name="calendar" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={openEndDatePicker}
            >
              <View style={styles.dateTimeContent}>
                <Text style={styles.dateTimeLabel}>End Time</Text>
                <Text style={styles.dateTimeText}>
                  {formatDate(eventDetails.endTime)}
                </Text>
                <Text style={styles.dateTimeText}>
                  {formatTime(eventDetails.endTime)}
                </Text>
              </View>
              <Ionicons name="calendar" size={24} color="#666" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor="#666"
              value={eventDetails.location}
              onChangeText={location => setEventDetails(prev => ({ ...prev, location }))}
            />
          </View>

          {/* Match-specific fields */}
          {eventDetails.type === 'match' && (
            <View style={styles.matchSection}>
              <Text style={styles.sectionTitle}>Match Details</Text>
              
              <View style={styles.matchDetailsRow}>
                <View style={styles.opponentContainer}>
                  <Text style={styles.fieldLabel}>Opponent</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Opponent Team Name"
                    placeholderTextColor="#666"
                    value={eventDetails.opponent}
                    onChangeText={opponent => setEventDetails(prev => ({ ...prev, opponent }))}
                  />
                </View>

                <View style={styles.homeGameContainer}>
                  <Text style={styles.fieldLabel}>Match Location</Text>
                  <View style={styles.toggleContainer}>
                    <Text style={styles.toggleLabel}>Home Game</Text>
                    <TouchableOpacity
                      style={[
                        styles.toggle,
                        eventDetails.isHomeGame && styles.toggleSelected,
                      ]}
                      onPress={() => setEventDetails(prev => ({ 
                        ...prev, 
                        isHomeGame: !prev.isHomeGame 
                      }))}
                    >
                      <View style={[
                        styles.toggleHandle,
                        eventDetails.isHomeGame && styles.toggleHandleSelected,
                      ]} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formationSection}>
                <Text style={styles.fieldLabel}>Team Setup</Text>
                <TouchableOpacity
                  style={styles.formationButton}
                  onPress={() => navigation.navigate('FormationTemplate', {
                    onFormationSelect: (selectedFormation: string) => {
                      // Update formation and clear roster when selecting a new formation
                      setEventDetails(prev => ({
                        ...prev,
                        formation: selectedFormation,
                        roster: [] // Clear roster when changing formation
                      }));
                      // First navigate back to Schedule screen
                      navigation.goBack();
                      // Then navigate to FormationSetup with the selected formation
                      setTimeout(() => {
                        navigation.navigate('FormationSetup', {
                          formation: selectedFormation,
                          players: eventDetails.roster || [],
                          onComplete: (players: SelectedPlayer[]) => {
                            setEventDetails(prev => ({
                              ...prev,
                              formation: selectedFormation,
                              roster: players
                            }));
                          },
                          // Add match details for confirmation screen
                          id: 'temp-id', // Temporary ID for new match
                          title: eventDetails.title,
                          date: eventDetails.startTime,
                          time: eventDetails.startTime,
                          location: eventDetails.location,
                          isHomeGame: eventDetails.isHomeGame || false,
                          opponent: eventDetails.opponent || '',
                          notes: eventDetails.description
                        });
                      }, 100); // Small delay to ensure smooth navigation
                    }
                  })}
                >
                  <View style={styles.formationButtonContent}>
                    <Text style={styles.formationButtonText}>
                      {eventDetails.formation ? 'Edit Formation & Positions' : 'Set Formation & Positions'}
                    </Text>
                    <Ionicons name="football-outline" size={24} color="#fff" />
                  </View>
                </TouchableOpacity>

                {eventDetails.formation && (
                  <View style={styles.selectedFormationInfo}>
                    <Text style={styles.selectedFormationText}>
                      Current Formation: {eventDetails.formation}
                    </Text>
                    <Text style={styles.selectedFormationText}>
                      Players in Formation: {eventDetails.roster?.length || 0}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Common fields for all event types */}
          <View style={styles.formSection}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#666"
              value={eventDetails.description}
              onChangeText={description => setEventDetails(prev => ({ ...prev, description }))}
              multiline
              numberOfLines={4}
            />

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Outdoor Event</Text>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  eventDetails.isOutdoor && styles.toggleSelected,
                ]}
                onPress={() => setEventDetails(prev => ({ 
                  ...prev, 
                  isOutdoor: !prev.isOutdoor 
                }))}
              >
                <View style={[
                  styles.toggleHandle,
                  eventDetails.isOutdoor && styles.toggleHandleSelected,
                ]} />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Attendance Required</Text>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  eventDetails.isAttendanceRequired && styles.toggleSelected,
                ]}
                onPress={() => setEventDetails(prev => ({ 
                  ...prev, 
                  isAttendanceRequired: !prev.isAttendanceRequired 
                }))}
              >
                <View style={[
                  styles.toggleHandle,
                  eventDetails.isAttendanceRequired && styles.toggleHandleSelected,
                ]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Add padding at the bottom for the floating button */}
          <View style={styles.bottomPadding} />
        </ScrollView>
        
        {/* Fixed floating save button */}
        <TouchableOpacity
          style={[styles.floatingSaveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.floatingSaveButtonText}>
            {loading ? 'Saving...' : 'Save Event'}
          </Text>
          <Ionicons name="save-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Android Date Picker - shown inline */}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={eventDetails.startTime}
          mode={datePickerMode}
          display="default"
          onChange={handleStartTimeChange}
        />
      )}

      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={eventDetails.endTime}
          mode={datePickerMode}
          display="default"
          onChange={handleEndTimeChange}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1f3d',
    paddingTop: Platform.OS === 'ios' ? 50 : 0, // Add safe area padding for iOS
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20, // Add bottom padding for scrolling content
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a305e',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a305e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  screenContainer: {
    flex: 1,
  },
  formSection: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    gap: 16,
  },
  matchSection: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    gap: 16,
  },
  input: {
    backgroundColor: '#1a1f3d',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1f3d',
    paddingVertical: 12,
    borderRadius: 12,
  },
  typeButtonSelected: {
    backgroundColor: '#e17777',
  },
  typeButtonText: {
    color: '#666',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1f3d',
    borderRadius: 12,
    padding: 16,
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  dateTimeText: {
    color: '#fff',
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1f3d',
    borderRadius: 12,
    padding: 16,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 16,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2a305e',
    padding: 2,
  },
  toggleSelected: {
    backgroundColor: '#e17777',
  },
  toggleHandle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#666',
  },
  toggleHandleSelected: {
    backgroundColor: '#fff',
    transform: [{ translateX: 20 }],
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  matchDetailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  opponentContainer: {
    flex: 1,
  },
  homeGameContainer: {
    flex: 1,
  },
  formationSection: {
    gap: 12,
  },
  formationButton: {
    backgroundColor: '#1a1f3d',
    borderRadius: 12,
    padding: 16,
  },
  formationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedFormationInfo: {
    backgroundColor: '#1a1f3d',
    borderRadius: 12,
    padding: 16,
  },
  selectedFormationText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#2a305e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateTimePicker: {
    height: 200,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    backgroundColor: '#e17777',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomPadding: {
    height: 80, // Adjust this value based on the height of the floating button
  },
  floatingSaveButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  floatingSaveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  placeholderView: {
    width: 40, // Equal to the back button width
  },
}); 