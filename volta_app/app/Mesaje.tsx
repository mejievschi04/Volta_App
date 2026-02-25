import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from './_context/ThemeContext';
import { UserContext } from './_context/UserContext';
import Screen from './_components/Screen';
import { getColors } from './_components/theme';
import { useResponsive, responsiveSize } from './_hooks/useResponsive';
import { apiClient } from '../lib/apiClient';
import { useMessages } from '../hooks/useMessages';
import ApiErrorView from './_components/ApiErrorView';
import EmptyState from './_components/EmptyState';

const { width } = Dimensions.get('window');

type Message = {
  id: string | number;
  message: string;
  is_from_admin: boolean;
  created_at: string;
  user_id?: number | null;
  _optimistic?: boolean;
};

export default function Mesaje() {
  const { theme } = useContext(ThemeContext);
  const { user } = useContext(UserContext);
  const colors = getColors(theme);
  const isDark = theme === 'dark';
  const router = useRouter();
  const { scale } = useResponsive();

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { data: messagesData, isError: messagesError, error: messagesErrorObj, refetch, isLoading: messagesLoading } = useMessages(user?.id ?? null, { refetchInterval: 3000 });
  const serverMessages = Array.isArray(messagesData) ? messagesData : [];
  const messages = [...serverMessages, ...optimisticMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Scroll to bottom when new message is added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const loadMessages = useCallback(() => {
    refetch();
  }, [refetch]);

  const sendMessage = async () => {
    if (messageText.trim().length === 0 || sending) return;

    const textToSend = messageText.trim();
    const userId = user?.id || null;

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      message: textToSend,
      is_from_admin: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setOptimisticMessages((prev) => [...prev, optimistic]);
    setMessageText('');
    setSending(true);

    try {
      const { error } = await apiClient.sendMessage(userId, textToSend);

      if (error) {
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setMessageText(textToSend);
        Alert.alert('Eroare', `Nu s-a putut trimite mesajul: ${error}`, [{ text: 'OK' }]);
      } else {
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        await refetch();
      }
    } catch (error: any) {
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMessageText(textToSend);
      Alert.alert('Eroare', error.message || 'Eroare la trimitere', [{ text: 'OK' }]);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ro-RO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const showSupportInfo = useCallback(() => {
    Alert.alert(
      'Volta Support',
      'Program: Luni – Vineri, 9:00 – 18:00\n\nScrie-ne oricând, răspundem cât putem de repede.',
      [{ text: 'OK' }]
    );
  }, []);

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? colors.surface : '#FFF',
              borderBottomColor: colors.border,
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={[styles.avatarContainer, { backgroundColor: isDark ? colors.surface : '#333' }]}>
              <Ionicons name="business" size={24} color={colors.primaryButton} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Volta Support</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Răspunde rapid</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.infoButton}
            activeOpacity={0.7}
            onPress={showSupportInfo}
            accessibilityLabel="Informații support"
            accessibilityRole="button"
            accessibilityHint="Afișează programul și informații Volta Support"
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {user && messagesError ? (
            <View style={[styles.emptyContainer, { paddingVertical: 32 }]}>
              <ApiErrorView
                message={messagesErrorObj?.message ?? undefined}
                onRetry={() => refetch()}
              />
            </View>
          ) : user && messagesLoading && serverMessages.length === 0 ? (
            <View style={[styles.emptyContainer, { paddingVertical: 32 }]}>
              <ActivityIndicator size="large" color={colors.primaryButton} />
              <Text style={[styles.emptySubtext, { color: colors.textMuted, marginTop: 12 }]}>
                Se încarcă conversația...
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="Începe conversația"
              description="Trimite un mesaj și vom răspunde cât mai curând"
              style={{ paddingVertical: 32 }}
            />
          ) : (
            messages.map((message, index) => {
              const isSent = !message.is_from_admin;
              const isOptimistic = !!(message as Message)._optimistic;
              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageWrapper,
                    isSent ? styles.messageSentWrapper : styles.messageReceivedWrapper,
                    isOptimistic && { opacity: 0.9 },
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isSent
                        ? [styles.messageSent, { backgroundColor: '#FFEE00' }]
                        : [
                            styles.messageReceived,
                            {
                              backgroundColor: isDark ? colors.surface : '#F5F5F5',
                              borderColor: colors.border,
                            },
                          ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        { color: isSent ? '#000' : colors.text },
                      ]}
                    >
                      {message.message}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        { color: isSent ? 'rgba(0,0,0,0.5)' : colors.textMuted },
                      ]}
                    >
                      {formatTime(message.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input Container */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? colors.surface : '#FFF',
              borderTopColor: colors.border,
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
                  borderColor: colors.border,
                },
              ]}
              placeholder="Scrie un mesaj..."
              placeholderTextColor={colors.textMuted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    messageText.trim().length > 0 && !sending
                      ? '#FFEE00'
                      : isDark
                      ? colors.surface
                      : '#E5E5E5',
                  opacity: messageText.trim().length > 0 && !sending ? 1 : 0.5,
                },
              ]}
              onPress={sendMessage}
              disabled={messageText.trim().length === 0 || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <Ionicons name="hourglass-outline" size={22} color={colors.textMuted} />
              ) : (
                <Ionicons name="send" size={22} color={messageText.trim().length > 0 ? '#000' : colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: Platform.OS === 'ios' ? 60 : 32,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  infoButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    width: '100%',
  },
  messagesContent: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  messageSentWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageReceivedWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  messageSent: {
    borderBottomRightRadius: 4,
  },
  messageReceived: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

