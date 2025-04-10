import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  SafeAreaView,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { Timestamp } from 'firebase/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.config';

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationSettings?.pushEnabled ?? true);
  const [privacySettings, setPrivacySettings] = useState({
    showEmail: user?.privacySettings?.showEmail ?? true,
    showPhone: user?.privacySettings?.showPhone ?? true,
    showLocation: user?.privacySettings?.showLocation ?? true,
  });
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getRoleDisplay = (type: string) => {
    switch (type) {
      case 'trainer':
        return 'Head Coach';
      case 'team_member':
        return 'Player';
      default:
        return 'Team Member';
    }
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toDate()).toLocaleDateString();
  };

  const updateUserSettings = async (updates: any) => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, updates);
      Alert.alert('Success', 'Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    await updateUserSettings({
      notificationSettings: {
        ...user?.notificationSettings,
        pushEnabled: newValue,
      },
    });
  };

  const handlePrivacySetting = async (setting: keyof typeof privacySettings) => {
    const newValue = !privacySettings[setting];
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: newValue,
    }));
    await updateUserSettings({
      privacySettings: {
        ...user?.privacySettings,
        [setting]: newValue,
      },
    });
  };

  const handleSavePhone = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    await updateUserSettings({ phone: phoneNumber.trim() });
    setIsEditingPhone(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle" size={120} color={theme.colors.primary} />
            )}
          </View>
          <Text style={styles.name}>{user?.name || 'User Name'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.role}>{getRoleDisplay(user?.type || '')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={24} color={theme.colors.text.primary} />
            <Text style={styles.infoText}>{user?.phone || 'Not provided'}</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditingPhone(true)}
            >
              <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={24} color={theme.colors.text.primary} />
            <Text style={styles.infoText}>{user?.location || 'Not provided'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.text.primary} />
            <Text style={styles.infoText}>Member since {formatDate(user?.createdAt as Timestamp)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={24} color={theme.colors.text.primary} />
              <Text style={styles.menuText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              disabled={loading}
            />
          </View>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              const newValue = !user?.notificationSettings?.emailEnabled;
              updateUserSettings({
                notificationSettings: {
                  ...user?.notificationSettings,
                  emailEnabled: newValue,
                },
              });
            }}
          >
            <Ionicons name="mail-outline" size={24} color={theme.colors.text.primary} />
            <Text style={styles.menuText}>Email Notifications</Text>
            <Switch
              value={user?.notificationSettings?.emailEnabled ?? false}
              onValueChange={() => {
                const newValue = !user?.notificationSettings?.emailEnabled;
                updateUserSettings({
                  notificationSettings: {
                    ...user?.notificationSettings,
                    emailEnabled: newValue,
                  },
                });
              }}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
              thumbColor={user?.notificationSettings?.emailEnabled ? '#fff' : '#f4f3f4'}
              disabled={loading}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail-outline" size={24} color={theme.colors.text.primary} />
              <Text style={styles.menuText}>Show Email</Text>
            </View>
            <Switch
              value={privacySettings.showEmail}
              onValueChange={() => handlePrivacySetting('showEmail')}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
              thumbColor={privacySettings.showEmail ? '#fff' : '#f4f3f4'}
              disabled={loading}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="call-outline" size={24} color={theme.colors.text.primary} />
              <Text style={styles.menuText}>Show Phone</Text>
            </View>
            <Switch
              value={privacySettings.showPhone}
              onValueChange={() => handlePrivacySetting('showPhone')}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
              thumbColor={privacySettings.showPhone ? '#fff' : '#f4f3f4'}
              disabled={loading}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="location-outline" size={24} color={theme.colors.text.primary} />
              <Text style={styles.menuText}>Show Location</Text>
            </View>
            <Switch
              value={privacySettings.showLocation}
              onValueChange={() => handlePrivacySetting('showLocation')}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
              thumbColor={privacySettings.showLocation ? '#fff' : '#f4f3f4'}
              disabled={loading}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="language-outline" size={24} color={theme.colors.text.primary} />
            <Text style={styles.menuText}>Language</Text>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="color-palette-outline" size={24} color={theme.colors.text.primary} />
            <Text style={styles.menuText}>Theme</Text>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.text.primary} />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={isEditingPhone}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditingPhone(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsEditingPhone(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSavePhone}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  role: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a305e',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  editButton: {
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 16,
    borderRadius: 12,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.text.secondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: theme.colors.text.secondary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 