import React, { useState, useEffect } from 'react';
import { View, Modal, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { theme } from '../theme';
import { PlayerMatchStats } from '../types/database';

interface EditStatsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (stats: PlayerMatchStats['stats']) => Promise<void>;
  playerName: string;
  initialStats: PlayerMatchStats['stats'];
  isGoalkeeper?: boolean;
}

export const EditStatsModal: React.FC<EditStatsModalProps> = ({
  visible,
  onClose,
  onSave,
  playerName,
  initialStats,
  isGoalkeeper,
}) => {
  const [stats, setStats] = useState(initialStats);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(stats);
      onClose();
    } catch (error) {
      console.error('Error saving stats:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const StatInput = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statInputContainer}>
        <TouchableOpacity
          style={styles.statButton}
          onPress={() => onChange(Math.max(0, value - 1))}
        >
          <Text style={styles.statButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.statValue}>{value}</Text>
        <TouchableOpacity
          style={styles.statButton}
          onPress={() => onChange(value + 1)}
        >
          <Text style={styles.statButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Stats: {playerName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.statsContainer}>
            <StatInput
              label="Goals"
              value={stats.goals}
              onChange={(value) => setStats(prev => ({ ...prev, goals: value }))}
            />
            <StatInput
              label="Assists"
              value={stats.assists}
              onChange={(value) => setStats(prev => ({ ...prev, assists: value }))}
            />
            <StatInput
              label="Shots on Target"
              value={stats.shotsOnTarget}
              onChange={(value) => setStats(prev => ({ ...prev, shotsOnTarget: value }))}
            />
            <StatInput
              label="Yellow Cards"
              value={stats.yellowCards}
              onChange={(value) => setStats(prev => ({ ...prev, yellowCards: value }))}
            />
            <StatInput
              label="Red Cards"
              value={stats.redCards}
              onChange={(value) => setStats(prev => ({ ...prev, redCards: value }))}
            />
            <StatInput
              label="Minutes Played"
              value={stats.minutesPlayed}
              onChange={(value) => setStats(prev => ({ ...prev, minutesPlayed: value }))}
            />
            
            {isGoalkeeper && (
              <>
                <StatInput
                  label="Saves"
                  value={stats.saves}
                  onChange={(value) => setStats(prev => ({ ...prev, saves: value }))}
                />
                <StatInput
                  label="Goals Conceded"
                  value={stats.goalsConceded}
                  onChange={(value) => setStats(prev => ({ ...prev, goalsConceded: value }))}
                />
                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleLabel}>Clean Sheet</Text>
                  <TouchableOpacity
                    style={[styles.toggle, stats.cleanSheet && styles.toggleActive]}
                    onPress={() => setStats(prev => ({ ...prev, cleanSheet: !prev.cleanSheet }))}
                  >
                    <Text style={[styles.toggleText, stats.cleanSheet && styles.toggleTextActive]}>
                      {stats.cleanSheet ? 'Yes' : 'No'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.footerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.footerButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
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
    color: theme.colors.text.primary,
  },
  closeButton: {
    fontSize: 24,
    color: theme.colors.text.secondary,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statItem: {
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  statInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  statButton: {
    width: 36,
    height: 36,
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    minWidth: 40,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  toggle: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  footerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.error,
  },
  saveButton: {
    backgroundColor: theme.colors.success,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 