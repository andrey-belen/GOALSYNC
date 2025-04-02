import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { sendMessage, getMessages, markMessageAsRead, editMessage, deleteMessage } from '../config/firebase';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { User } from 'firebase/auth';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../types/navigation';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: any;
  readBy: string[];
  edited?: boolean;
  type?: 'message' | 'announcement' | 'event';
  announcementData?: {
    title: string;
    priority: 'normal' | 'high';
  };
  eventData?: {
    id: string;
    title: string;
    type: string;
    startTime: any;
    location: string;
    formation?: string;
    roster?: {
      id: string;
      name: string;
      number: string;
      position: 'GK' | 'DEF' | 'MID' | 'FWD';
      isStarter: boolean;
      fieldPosition?: string;
      status?: 'active' | 'injured';
    }[];
    opponent?: string;
    isHomeGame?: boolean;
  };
}

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Chat'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = NativeStackScreenProps<MainTabParamList, 'Chat'>;

export const ChatScreen = ({ route }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation<NavigationProp>();
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  const { teamId } = route.params;

  useEffect(() => {
    const unsubscribe = getMessages(teamId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId]);

  useEffect(() => {
    // Mark new messages as read
    const markNewMessagesAsRead = async () => {
      if (!user) return;

      const unreadMessages = messages.filter(
        (msg) => !msg.readBy.includes(user.id)
      );

      for (const message of unreadMessages) {
        await markMessageAsRead(teamId, message.id);
      }
    };

    markNewMessagesAsRead();
  }, [messages, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      if (editingMessage) {
        await editMessage(teamId, editingMessage.id, newMessage.trim());
        setEditingMessage(null);
      } else {
        await sendMessage(teamId, newMessage.trim());
      }
      setNewMessage('');
      flatListRef.current?.scrollToEnd();
    } catch (error) {
      console.error('Error sending/editing message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setNewMessage(message.text);
  };

  const handleDelete = async (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(teamId, messageId);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            }
          },
        },
      ]
    );
  };

  const showActionSheet = () => {
    setShowOptions(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const hideActionSheet = () => {
    setShowOptions(false);
    Animated.spring(slideAnim, {
      toValue: Dimensions.get('window').height,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = (message: Message) => {
    console.log('Long press detected:', message.id);
    if (message.userId === user?.id && (!message.type || message.type === 'message')) {
      setSelectedMessage(message);
      showActionSheet();
    }
  };

  const handleOptionSelect = (action: 'edit' | 'delete') => {
    if (!selectedMessage) return;

    if (action === 'edit') {
      handleEdit(selectedMessage);
    } else {
      handleDelete(selectedMessage.id);
    }
    hideActionSheet();
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.userId === user?.id;
    const isAnnouncement = item.type === 'announcement';
    const isEvent = item.type === 'event';

    if (isEvent && item.eventData) {
      const { id, type, title, startTime, location, formation, roster, opponent, isHomeGame } = item.eventData;
      const eventType = type as 'training' | 'match' | 'meeting';

      const getEventIcon = (type: 'training' | 'match' | 'meeting') => {
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

      const getEventColor = (type: 'training' | 'match' | 'meeting') => {
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
        <TouchableOpacity 
          style={styles.eventContainer}
          onPress={() => {
            if (eventType === 'match') {
              navigation.navigate('MatchDetails', {
                matchDetails: {
                  id,
                  title,
                  date: startTime.toDate(),
                  time: startTime.toDate(),
                  location,
                  isHomeGame: isHomeGame || false,
                  opponent: opponent || '',
                  formation: formation || '',
                  players: roster || []
                }
              });
            } else if (user?.type === 'trainer') {
              navigation.navigate('Attendance', {
                eventId: id,
                eventType,
                title,
                date: startTime.toDate(),
                time: startTime.toDate(),
                location,
              });
            } else {
              navigation.navigate('EventDetails', {
                eventId: id,
                title,
                type: eventType,
                date: startTime.toDate(),
                time: startTime.toDate(),
                location,
              });
            }
          }}
        >
          <View style={[
            styles.eventContent,
            { borderLeftColor: getEventColor(eventType) }
          ]}>
            <View style={styles.eventHeader}>
              <Ionicons 
                name={getEventIcon(eventType)} 
                size={20} 
                color={getEventColor(eventType)} 
              />
              <Text style={styles.eventTitle}>{title}</Text>
            </View>
            <Text style={styles.eventText}>{item.text}</Text>
            <View style={styles.messageFooter}>
              <Text style={styles.timestamp}>{formatMessageTime(item.timestamp)}</Text>
              <View style={styles.readStatus}>
                <Ionicons
                  name={item.readBy.length > 1 ? 'checkmark-done' : 'checkmark'}
                  size={16}
                  color={theme.colors.text.secondary}
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (isAnnouncement) {
      return (
        <View style={styles.announcementContainer}>
          <View style={[
            styles.announcementContent,
            item.announcementData?.priority === 'high' && styles.highPriorityAnnouncement
          ]}>
            <View style={styles.announcementHeader}>
              <Ionicons name="megaphone" size={20} color={theme.colors.primary} />
              <Text style={styles.announcementTitle}>
                {item.announcementData?.title}
              </Text>
            </View>
            <Text style={styles.announcementText}>{item.text.split('\n\n')[1]}</Text>
            <View style={styles.messageFooter}>
              <Text style={styles.timestamp}>{formatMessageTime(item.timestamp)}</Text>
              <View style={styles.readStatus}>
                <Ionicons
                  name={item.readBy.length > 1 ? 'checkmark-done' : 'checkmark'}
                  size={16}
                  color={theme.colors.text.secondary}
                />
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.9}
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          { marginVertical: 8 }
        ]}
      >
        {!isCurrentUser && (
          <Text style={styles.userName}>{item.userName}</Text>
        )}
        <Text style={styles.messageText}>{item.text}</Text>
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {formatMessageTime(item.timestamp)}
            {item.edited && ' (edited)'}
          </Text>
          <View style={styles.readStatus}>
            <Ionicons
              name={item.readBy.length > 1 ? 'checkmark-done' : 'checkmark'}
              size={16}
              color={theme.colors.text.secondary}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          onLayout={() => flatListRef.current?.scrollToEnd()}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={editingMessage ? "Edit message..." : "Type a message..."}
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            maxLength={500}
          />
          {editingMessage && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingMessage(null);
                setNewMessage('');
              }}
            >
              <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="send"
                size={24}
                color={newMessage.trim() ? '#fff' : theme.colors.text.secondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {showOptions && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={hideActionSheet}
          >
            <Animated.View 
              style={[
                styles.actionSheet,
                {
                  transform: [{ translateY: slideAnim }],
                  width: '100%',
                }
              ]}
            >
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  handleOptionSelect('edit');
                  hideActionSheet();
                }}
              >
                <Ionicons name="pencil" size={20} color={theme.colors.text.primary} />
                <Text style={styles.optionText}>Edit Message</Text>
              </TouchableOpacity>
              <View style={styles.optionDivider} />
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  handleOptionSelect('delete');
                  hideActionSheet();
                }}
              >
                <Ionicons name="trash" size={20} color="#FF5252" />
                <Text style={[styles.optionText, styles.deleteText]}>Delete Message</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  messageList: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 8,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a305e',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
  },
  readStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a305e',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a305e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    color: theme.colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2a305e',
  },
  announcementContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  announcementContent: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  highPriorityAnnouncement: {
    backgroundColor: 'rgba(225, 119, 119, 0.1)',
    borderLeftColor: theme.colors.primary,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  announcementText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    marginBottom: 8,
  },
  eventContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  eventContent: {
    backgroundColor: '#2a305e',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    borderLeftWidth: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  eventText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    marginBottom: 8,
  },
  userName: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  cancelButton: {
    padding: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#2a305e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
  },
  optionText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  deleteText: {
    color: '#FF5252',
  },
}); 