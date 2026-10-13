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
import type { CalendarAction } from '../services/ai/types';

import { sendToAI } from '../services/ai/aiservice';
import {
  createAppointment,
  deleteAppointment,
  getAllAppointments,
  updateAppointment,
} from '../storage/appointmentStorage';

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

function parseActionDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = '0'] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day) ||
    parsed.getHours() !== Number(hour) ||
    parsed.getMinutes() !== Number(minute)
  ) {
    return null;
  }

  return parsed;
}

function localDateTimeNow(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function toLocalDateTime(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

async function buildAppointmentsContext() {
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  rangeStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 90);

  const appointments = (await getAllAppointments())
    .filter((appointment) => appointment.endAt >= rangeStart && appointment.startAt < rangeEnd)
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());

  return {
    rangeStart: toLocalDateTime(rangeStart),
    rangeEnd: toLocalDateTime(rangeEnd),
    truncated: appointments.length > 25,
    appointments: appointments.slice(0, 25).map((appointment) => ({
      title: appointment.title.slice(0, 100),
      startAt: toLocalDateTime(appointment.startAt),
      endAt: toLocalDateTime(appointment.endAt),
      status: appointment.status,
    })),
  };
}

async function proposeCalendarAction(action?: CalendarAction): Promise<void> {
  if (!action || action.kind === 'none') return;

  try {
    if (action.kind === 'create') {
      const startDate = parseActionDate(action.startAt);
      const endDate = parseActionDate(action.endAt);

      if (!action.title.trim() || !startDate || !endDate || endDate <= startDate) {
        Alert.alert('นัดหมายยังไม่ครบ', 'AI ยังระบุชื่อหรือช่วงเวลาได้ไม่ชัดเจน กรุณาระบุรายละเอียดเพิ่ม');
        return;
      }

      Alert.alert(
        'ยืนยันเพิ่มนัดหมาย',
        `${action.title}\n${startDate.toLocaleString('th-TH')} - ${endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'บันทึก',
            onPress: () => {
              void createAppointment({
                title: action.title.trim(),
                startAt: startDate,
                endAt: endDate,
                location: action.location,
                notes: action.notes,
              }).catch((error) => {
                console.error('AI appointment create failed:', error);
                Alert.alert('บันทึกไม่สำเร็จ', 'ไม่สามารถบันทึกนัดหมายลงในแอปได้');
              });
            },
          },
        ],
      );
      return;
    }

    const targetStartAt = parseActionDate(action.targetStartAt);
    if (!action.targetTitle.trim() || !targetStartAt) {
      Alert.alert('ระบุนัดหมายไม่ชัดเจน', 'กรุณาบอกชื่อนัดหมายและวันที่หรือเวลาเดิมให้ชัดเจนก่อน');
      return;
    }

    const appointments = await getAllAppointments();
    const matches = appointments.filter((event) => {
      const eventStart = event.startAt;
      return event.title.trim().toLocaleLowerCase() === action.targetTitle.trim().toLocaleLowerCase() &&
        eventStart.getFullYear() === targetStartAt.getFullYear() &&
        eventStart.getMonth() === targetStartAt.getMonth() &&
        eventStart.getDate() === targetStartAt.getDate() &&
        eventStart.getHours() === targetStartAt.getHours() &&
        eventStart.getMinutes() === targetStartAt.getMinutes();
    });

    if (matches.length !== 1) {
      Alert.alert(
        matches.length === 0 ? 'ไม่พบนัดหมาย' : 'พบนัดหมายมากกว่าหนึ่งรายการ',
        'ไม่ได้เปลี่ยนแปลงรายการ กรุณาระบุชื่อและวันของนัดหมายให้ชัดเจน หรือจัดการจากหน้าการนัดหมาย',
      );
      return;
    }

    const event = matches[0];
    if (action.kind === 'delete') {
      Alert.alert(
        'ยืนยันลบนัดหมาย',
        `${event.title}\n${event.startAt.toLocaleString('th-TH')}`,
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ลบ',
            style: 'destructive',
            onPress: () => {
              void deleteAppointment(event.id).catch((error) => {
                console.error('AI appointment delete failed:', error);
                Alert.alert('ลบไม่สำเร็จ', 'ไม่สามารถลบนัดหมายออกจากแอปได้');
              });
            },
          },
        ],
      );
      return;
    }

    const startDate = action.startAt ? parseActionDate(action.startAt) : event.startAt;
    const endDate = action.endAt ? parseActionDate(action.endAt) : event.endAt;
    if (!startDate || !endDate || endDate <= startDate) {
      Alert.alert('เวลาใหม่ไม่ถูกต้อง', 'ไม่ได้เปลี่ยนแปลงนัดหมาย กรุณาระบุเวลาเริ่มและสิ้นสุดให้ถูกต้อง');
      return;
    }

    const updated = {
      title: action.title.trim() || event.title,
      startAt: startDate,
      endAt: endDate,
      location: action.location || event.location,
      notes: action.notes || event.notes,
    };

    Alert.alert(
      'ยืนยันแก้ไขนัดหมาย',
      `${event.title} → ${updated.title}\n${startDate.toLocaleString('th-TH')} - ${endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'บันทึกการแก้ไข',
          onPress: () => {
            void updateAppointment(event.id, updated).catch((error) => {
              console.error('AI appointment update failed:', error);
              Alert.alert('แก้ไขไม่สำเร็จ', 'ไม่สามารถแก้ไขนัดหมายในแอปได้');
            });
          },
        },
      ],
    );
  } catch (error) {
    console.error('Failed to prepare AI appointment action:', error);
    Alert.alert('จัดการนัดหมายไม่ได้', 'โปรดลองอีกครั้ง');
  }
}

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

        const appointmentsContext = await buildAppointmentsContext();
        
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
            appointmentsContext,
            calendarContext: {
              localDateTime: localDateTimeNow(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            },
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
        void proposeCalendarAction(aiResponse.calendarAction);


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
                      วันนี้อยากคุยเรื่องอะไรกับฉันดี? ช่วยบอกฉันหน่อย
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