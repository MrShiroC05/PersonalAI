import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerScreenProps } from '@react-navigation/drawer';

import ChatBubble from '../components/ChatBubble';
import ChatInput from '../components/ChatInput';

import type { RootDrawerParamList } from '../navigation/AppNavigator';
import type { Chat, ChatMessage } from '../types/chat';

import { sendToAI } from '../services/ai/aiservice';

import { colors, radius, spacing } from '../styles/theme';

import { getAllMemories } from '../storage/memoryStorage';
import { getDatabase } from '../storage/database';
import {
  createChat,
  getAllChats,
  getChatById,
  setAutoChatTitle,
} from '../storage/chatStorage';

import {
  getMessagesByChatId,
  saveMessage,
} from '../storage/messageStorage';

type Props = DrawerScreenProps<RootDrawerParamList, 'Chat'>;

export default function ChatScreen({ navigation, route }: Props) {
  
  const sendingLock = useRef(false);

  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  

  const requestedChatId = route.params?.chatId;

  // โหลดห้องแชตล่าสุดและข้อความเก่าจาก SQLite
  useEffect(() => {
      let cancelled = false;
  
      async function initializeChat() {
        setIsLoading(true);
  
        try {
          await getDatabase();
  
          // ถ้ามี chatId ให้เปิดห้องนั้นก่อน
          let chat = requestedChatId
            ? await getChatById(requestedChatId)
            : null;
  
          // ถ้าไม่มี chatId หรือห้องนั้นถูกลบไปแล้ว
          // ให้เลือกห้องล่าสุดแทน
          if (!chat) {
            const chats = await getAllChats();
            chat = chats[0] ?? (await createChat());
          }
  
          const chatMessages = await getMessagesByChatId(chat.id);
  
          if (cancelled) return;
  
          setCurrentChat(chat);
          setMessages(chatMessages);
  
          // บันทึกห้องที่กำลังเปิดไว้ใน navigation params
          // เพื่อให้ Drawer ทราบว่าห้องใดกำลังถูกเลือก
          if (requestedChatId !== chat.id) {
            navigation.setParams({
              chatId: chat.id,
            });
          }
        } catch (error) {
          console.error('Failed to initialize chat:', error);
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      }
  
      void initializeChat();
  
      return () => {
        cancelled = true;
      };
    }, [requestedChatId, navigation]);

    // ส่งข้อความและบันทึกลง SQLite
  
  
  const handleSend = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();

      if (
        !currentChat ||
        sendingLock.current ||
        isLoading ||
        !trimmedText
      ) {
        return;
      }

      // ล็อกทันที ก่อนเริ่มงาน asynchronous
      sendingLock.current = true;
      setIsSending(true);

      try {
        // ตรวจสอบจาก SQLite ว่ามีข้อความของผู้ใช้แล้วหรือยัง
        const existingMessages = await getMessagesByChatId(currentChat.id);
        const isFirstUserMessage = !existingMessages.some(
          (message) => message.role === 'user',
        );

        // บันทึกข้อความผู้ใช้ก่อน
        const userMessage = await saveMessage(
          currentChat.id,
          'user',
          trimmedText,
        );

        setMessages((previous) => [...previous, userMessage]);

        // ตั้งชื่ออัตโนมัติเฉพาะข้อความแรก
        if (isFirstUserMessage) {
          try {
            const updatedChat = await setAutoChatTitle(
              currentChat.id,
              trimmedText,
            );

            if (updatedChat) {
              setCurrentChat(updatedChat);
            }
          } catch (titleError) {
            console.error('Failed to set chat title:', titleError);
          }
        }

        const savedMemories = await getAllMemories();

        const memoryContext = savedMemories
          .slice(0, 10)
          .map(
            (memory, index) =>
              `${index + 1}. [${memory.category}] ${memory.content}`,
          )
          .join('\n')
          .slice(0, 5000);
        
        const aiResponse = await sendToAI(
          {
            messages: [
              ...existingMessages.map((message) => ({
                role: message.role,
                content: message.text,
              })),
              {
                role: 'user',
                content: trimmedText,
              },
            ],
            memoryContext,
          },
          'online',
        );
        const assistantMessage = await saveMessage(
          currentChat.id,
          'assistant',
          aiResponse.text,
        );

        setMessages((previous) => [
          ...previous,
          assistantMessage,
        ]);


      } catch (error) {
        console.error('Failed to send message:', error);

        Alert.alert(
          'ส่งข้อความไม่สำเร็จ',
          'บันทึกข้อความหรือสร้างคำตอบไม่สำเร็จ กรุณาลองอีกครั้ง',
        );
      } finally {
        sendingLock.current = false;
        setIsSending(false);
      }
    },
    [currentChat, isLoading],
  );


    
    const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble message={item} />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => navigation.openDrawer()}
                accessibilityRole="button"
                accessibilityLabel="Open navigation menu"
              >
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
      
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>
                  Mira <Text style={styles.heart}>♥</Text>
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isSending ? 'กำลังพิมพ์...' : 'Personal AI Companion'}
                </Text>
              </View>
      
              <View style={styles.statusDot} />
            </View>
      
            {/* Chat content */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>
                  กำลังโหลดบทสนทนาของเรา... 💜
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                style={styles.messageList}
                contentContainerStyle={[
                  styles.messageContent,
                  messages.length === 0 && styles.emptyMessageContent,
                ]}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (messages.length > 0) {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>🌙</Text>
                    <Text style={styles.emptyTitle}>
                      ยินดีที่ได้พบกัน!
                    </Text>
                    <Text style={styles.emptyDescription}>
                      วันนี้อยากคุยเรื่องอะไรกับฉันดี?
                    </Text>
                  </View>
                }
              />
            )}
      
            {/* Sending indicator */}
            {isSending && (
              <View style={styles.typingContainer}>
                <View style={styles.typingBubble}>
                  <ActivityIndicator
                    size="small"
                    color={colors.secondary}
                  />
                  <Text style={styles.typingText}>
                    Mira กำลังคิด...
                  </Text>
                </View>
              </View>
            )}
      
            {/* Message input */}
            <View style={styles.inputContainer}>
              <ChatInput
                onSend={(text) => {
                  void handleSend(text);
                }}
                disabled={isSending || isLoading || !currentChat}
              />
            </View>
          </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  menuButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },

  menuIcon: {
    color: colors.primary,
    fontSize: 23,
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },

  headerTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },

  heart: {
    color: colors.secondary,
  },

  headerSubtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },

  messageList: {
    flex: 1,
  },

  messageContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  emptyMessageContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },

  emptyEmoji: {
    fontSize: 46,
    marginBottom: spacing.md,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  emptyDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  typingContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },

  typingBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.assistantBubble,
  },

  typingText: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});