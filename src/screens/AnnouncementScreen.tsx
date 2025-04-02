import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { createAnnouncement } from '../config/firebase';

type Props = NativeStackScreenProps<RootStackParamList, 'Announcement'>;

export const AnnouncementScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user?.teamId || !user?.id) {
      Alert.alert('Error', 'User or team information not found');
      return;
    }

    try {
      setLoading(true);
      await createAnnouncement({
        teamId: user.teamId,
        title: title.trim(),
        message: message.trim(),
        createdBy: user.id,
        priority,
      });

      Alert.alert(
        'Success',
        'Announcement created successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', 'Failed to create announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Announcement</Text>
          <TouchableOpacity 
            style={[
              styles.priorityButton,
              priority === 'high' && styles.priorityButtonActive
            ]}
            onPress={() => setPriority(priority === 'normal' ? 'high' : 'normal')}
          >
            <Ionicons 
              name={priority === 'high' ? 'alert-circle' : 'alert-circle-outline'} 
              size={20} 
              color={priority === 'high' ? theme.colors.primary : theme.colors.text.secondary} 
            />
            <Text style={[
              styles.priorityText,
              priority === 'high' && styles.priorityTextActive
            ]}>
              High Priority
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter announcement title"
              placeholderTextColor={theme.colors.text.secondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Enter announcement message"
              placeholderTextColor={theme.colors.text.secondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Posting...' : 'Post Announcement'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2a305e',
    gap: 4,
  },
  priorityButtonActive: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
  },
  priorityText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  priorityTextActive: {
    color: theme.colors.primary,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  messageInput: {
    height: 150,
  },
  footer: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a305e',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2a305e',
    alignItems: 'center',
  },
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 