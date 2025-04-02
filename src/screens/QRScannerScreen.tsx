import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { joinTeamByQR } from '../config/firebase';
import { useNavigation, useIsFocused, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

type Props = NativeStackScreenProps<RootStackParamList, 'QRScanner'>;

export const QRScannerScreen: React.FC<Props> = ({ navigation: stackNavigation }) => {
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanInProgress = useRef(false);
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NavigationProp>();

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    // Use ref to prevent multiple simultaneous scans
    if (scanned || !isFocused || isProcessing || scanInProgress.current) return;
    
    // Immediately set ref to prevent other scans
    scanInProgress.current = true;
    
    setIsProcessing(true);
    setScanned(true);
    
    try {
      // Validate QR code format
      let teamData;
      try {
        teamData = JSON.parse(data);
        if (!teamData.teamId || !teamData.teamName) {
          throw new Error('Invalid QR code format');
        }
      } catch {
        Alert.alert('Error', 'Invalid team QR code', [
          { text: 'OK', onPress: () => {
            setScanned(false);
            setIsProcessing(false);
            scanInProgress.current = false;
          }}
        ]);
        return;
      }

      // Confirm join
      Alert.alert(
        'Join Team',
        `Would you like to join ${teamData.teamName}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
              scanInProgress.current = false;
            },
          },
          {
            text: 'Join',
            onPress: async () => {
              try {
                await joinTeamByQR(teamData.teamId);
                // Close QR scanner and navigate to team screen
                stackNavigation.goBack();
                navigation.navigate('MainTabs', {
                  screen: 'Team',
                  params: { refresh: Date.now() }
                });
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to join team', [
                  { text: 'OK', onPress: () => {
                    setScanned(false);
                    setIsProcessing(false);
                    scanInProgress.current = false;
                  }}
                ]);
              }
            },
          },
        ],
        { 
          cancelable: false, // Prevent tapping outside to dismiss
          onDismiss: () => {
            // Ensure we reset states if alert is somehow dismissed
            setScanned(false);
            setIsProcessing(false);
            scanInProgress.current = false;
          }
        }
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process QR code', [
        { text: 'OK', onPress: () => {
          setScanned(false);
          setIsProcessing(false);
          scanInProgress.current = false;
        }}
      ]);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned && !isProcessing && (
        <CameraView
          style={[StyleSheet.absoluteFillObject, styles.scanner]}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
      )}
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.overlayText}>
          Scan a team QR code to join
        </Text>
        {scanned && !isProcessing && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setScanned(false);
              scanInProgress.current = false;
            }}
          >
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanner: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  text: {
    color: theme.colors.text.primary,
    fontSize: 16,
    marginBottom: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    marginBottom: 40,
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 