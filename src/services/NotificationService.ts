import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { db, auth } from '../firebase.config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class NotificationService {
  private static instance: NotificationService;
  private _pushToken: string | null = null;
  private _notificationListener: any = null;
  private _responseListener: any = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Register for push notifications and save the token to the user's profile
   */
  public async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications are not supported in an emulator/simulator');
      return null;
    }

    try {
      // Check if we have permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // If we don't have permission, ask for it
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // If we still don't have permission, return null
      if (finalStatus !== 'granted') {
        console.log('Permission for push notifications was denied');
        return null;
      }

      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Use your actual project ID from app.json
      });

      this._pushToken = token.data;

      // Save the token to the user's profile if logged in
      if (auth.currentUser) {
        await this.savePushToken(token.data);
      }

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save the push token to the user's profile in Firestore
   */
  public async savePushToken(token: string): Promise<void> {
    if (!auth.currentUser) {
      console.log('User must be logged in to save push token');
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // If the user has existing tokens, add the new one if it doesn't already exist
        const userData = userDoc.data();
        const existingTokens = userData.pushTokens || [];

        if (!existingTokens.includes(token)) {
          await updateDoc(userRef, {
            pushTokens: [...existingTokens, token],
            lastTokenUpdated: new Date(),
          });
          console.log('Push token saved to user profile');
        }
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Set up listeners for notifications and notification responses
   */
  public setupNotificationListeners(
    onNotification?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    // This listener is fired whenever a notification is received while the app is foregrounded
    this._notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
      if (onNotification) {
        onNotification(notification);
      }
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    this._responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response received:', response);
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });
  }

  /**
   * Clean up notification listeners
   */
  public cleanupNotificationListeners(): void {
    if (this._notificationListener) {
      Notifications.removeNotificationSubscription(this._notificationListener);
      this._notificationListener = null;
    }
    if (this._responseListener) {
      Notifications.removeNotificationSubscription(this._responseListener);
      this._responseListener = null;
    }
  }

  /**
   * Schedule a local notification
   */
  public async scheduleLocalNotification(
    { title, body, data }: PushNotificationData,
    seconds: number = 1
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null, // Immediate notification
    });
  }

  /**
   * Get the latest notification response (for deep linking)
   */
  public async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return await Notifications.getLastNotificationResponseAsync();
  }

  /**
   * Get the push token
   */
  public getPushToken(): string | null {
    return this._pushToken;
  }
}

// Export a singleton instance
export const notificationService = NotificationService.getInstance(); 