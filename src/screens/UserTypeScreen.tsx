import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';
import { useNavigation } from '@react-navigation/native';

export type UserType = 'team_member' | 'trainer' | 'individual';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'UserType'>;

export const UserTypeScreen = () => {
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const navigation = useNavigation<NavigationProp>();

  const handleUserTypeSelect = (type: UserType) => {
    navigation.navigate('Register', { userType: type });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={24} color="#666" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Select User Type</Text>
        <Text style={styles.subtitle}>What best describes you?</Text>

        <View style={styles.options}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedType === 'team_member' && styles.optionButtonSelected
            ]}
            onPress={() => setSelectedType('team_member')}
          >
            <View style={[
              styles.radioButton,
              selectedType === 'team_member' && styles.radioButtonSelected
            ]} />
            <Text style={styles.optionText}>I'm a part of a team</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedType === 'trainer' && styles.optionButtonSelected
            ]}
            onPress={() => setSelectedType('trainer')}
          >
            <View style={[
              styles.radioButton,
              selectedType === 'trainer' && styles.radioButtonSelected
            ]} />
            <Text style={styles.optionText}>I'm a trainer/manager</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedType === 'individual' && styles.optionButtonSelected
            ]}
            onPress={() => setSelectedType('individual')}
          >
            <View style={[
              styles.radioButton,
              selectedType === 'individual' && styles.radioButtonSelected
            ]} />
            <Text style={styles.optionText}>I'm an individual player</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !selectedType && styles.continueButtonDisabled]}
          onPress={() => handleUserTypeSelect(selectedType as UserType)}
          disabled={!selectedType}
        >
          <Text style={styles.continueButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1f3d',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  options: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2a305e',
    borderRadius: 12,
    gap: 16,
  },
  optionButtonSelected: {
    backgroundColor: '#2a305e',
    borderColor: '#e17777',
    borderWidth: 2,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
  },
  radioButtonSelected: {
    borderColor: '#e17777',
    backgroundColor: '#e17777',
  },
  optionText: {
    fontSize: 18,
    color: '#fff',
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#e17777',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  continueButtonDisabled: {
    backgroundColor: '#2a305e',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 