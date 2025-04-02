import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle, Platform } from 'react-native';
import { theme } from '../theme';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({ 
  children, 
  style,
  edges = ['top', 'right', 'bottom', 'left']
}) => {
  return (
    <SafeAreaView 
      style={[styles.safeArea, style]} 
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
}); 