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
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerScreenProps } from '@react-navigation/drawer';

import ChatBubble from '../components/ChatBubble';
import ChatInput from '../components/ChatInput';
import DrawerBTN from '../components/DrawerBTN';

import type { RootDrawerParamList } from '../navigation/AppNavigator';
import type { Chat, ChatMessage } from '../types/chat';
import { colors } from '../styles/theme';
import {
  setAutoChatTitle,
} from '../storage/chatStorage';
import {
  getMessagesByChatId,
  saveMessage,
} from '../storage/messageStorage';
import {
  generateChatReply,
  loadChatSession,
  proposeAppointmentAction,
} from '../services/process/chat';
import styles from '../styles/ChatScreen';

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
          const { chat, messages: chatMessages } = await loadChatSession(requestedChatId);
  
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

        const aiResponse = await generateChatReply(
          existingMessages.map((message) => ({
            role: message.role,
            content: message.text,
          })),
          trimmedText,
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
        void proposeAppointmentAction(aiResponse.calendarAction);


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
    <ImageBackground
      source={require('../images/backgroundImage.jpg')}
      resizeMode="cover"
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View pointerEvents="none" style={styles.backgroundTint} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.header}>
              <DrawerBTN />
      
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>
                  Mita <Text style={styles.heart}>♥</Text>
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
                    Mita กำลังคิด...
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
    </ImageBackground>
  );
}
