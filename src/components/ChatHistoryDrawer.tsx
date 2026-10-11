import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {
    DrawerContentScrollView,
    useDrawerStatus,
    type DrawerContentComponentProps,
} from '@react-navigation/drawer';

import { colors, radius, spacing } from '../styles/theme';
import type { Chat } from '../types/chat';
import {
    createChat,
    deleteChat,
    getAllChats,
    renameChat,
} from '../storage/chatStorage';

export default function ChatHistoryDrawer(
    props: DrawerContentComponentProps,
    ) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const [editingChat, setEditingChat] = useState<Chat | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [isSavingTitle, setIsSavingTitle] = useState(false);

    const activeRoute = props.state.routes.find(
        (route) => route.name === 'Chat',
    );

    const activeChatId = (
        activeRoute?.params as { chatId?: string } | undefined
    )?.chatId;

    const drawerStatus = useDrawerStatus();
    const loadChats = useCallback(async () => {
        try {
        const result = await getAllChats();
        setChats(result);
        } catch (error) {
        console.error('Failed to load chat history:', error);
        Alert.alert('Error', 'ไม่สามารถโหลดประวัติแชตได้');
        } finally {
        setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (drawerStatus === 'open') {
            void loadChats();
        }
    }, [drawerStatus, loadChats]);

  // เปิดห้องแชตที่เลือก
  const openChat = (chat: Chat) => {
    props.navigation.navigate('Chat', {
      chatId: chat.id,
    });

    props.navigation.closeDrawer();
  };

  // สร้างห้องแชตใหม่
  const handleCreateChat = async () => {
    if (isCreating) return;

    setIsCreating(true);

    try {
      const chat = await createChat();

      setChats((previous) => [
        chat,
        ...previous,
      ]);

      props.navigation.navigate('Chat', {
        chatId: chat.id,
      });

      props.navigation.closeDrawer();
    } catch (error) {
      console.error('Failed to create chat:', error);
      Alert.alert('Error', 'ไม่สามารถสร้างห้องแชตได้');
    } finally {
      setIsCreating(false);
    }
  };

  // เปิดหน้าต่างเปลี่ยนชื่อ
  const openRenameModal = (chat: Chat) => {
    setEditingChat(chat);
    setNewTitle(chat.title);
  };

  // บันทึกชื่อใหม่
  const handleRenameChat = async () => {
    if (!editingChat || isSavingTitle) return;

    const title = newTitle.trim();

    if (!title) {
      Alert.alert('แจ้งเตือน', 'กรุณาระบุชื่อห้องแชต');
      return;
    }

    setIsSavingTitle(true);

    try {
      await renameChat(editingChat.id, title);

      setChats((previous) =>
        previous
          .map((chat) =>
            chat.id === editingChat.id
              ? { ...chat, title, updatedAt: Date.now() }
              : chat,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );

      setEditingChat(null);
      setNewTitle('');
    } catch (error) {
      console.error('Failed to rename chat:', error);
      Alert.alert('Error', 'ไม่สามารถเปลี่ยนชื่อห้องแชตได้');
    } finally {
      setIsSavingTitle(false);
    }
  };

  // ลบห้องแชตและจัดการกรณีที่กำลังเปิดห้องนั้นอยู่
  const handleDeleteChat = (chat: Chat) => {
    Alert.alert(
      'ลบห้องแชต',
      `ต้องการลบ "${chat.title}" ใช่ไหม?\nข้อความในห้องนี้จะถูกลบด้วย`,
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteChat(chat.id);

                const remainingChats = chats.filter(
                  (item) => item.id !== chat.id,
                );

                setChats(remainingChats);

                if (activeChatId === chat.id) {
                  // ถ้ายังมีห้องอื่น ให้เปิดห้องแรก
                  if (remainingChats.length > 0) {
                    props.navigation.navigate('Chat', {
                      chatId: remainingChats[0].id,
                    });
                  } else {
                    // ถ้าไม่มีห้องเหลือ ให้สร้างห้องใหม่
                    const newChat = await createChat();

                    setChats([newChat]);

                    props.navigation.navigate('Chat', {
                      chatId: newChat.id,
                    });
                  }
                }
              } catch (error) {
                console.error('Failed to delete chat:', error);
                Alert.alert('Error', 'ไม่สามารถลบห้องแชตได้');
                void loadChats();
              }
            })();
          },
        },
      ],
    );
  };

  const navigateTo = (screen: 'Memory' | 'Settings') => {
    props.navigation.navigate(screen);
    props.navigation.closeDrawer();
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Drawer Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>M</Text>
          </View>

          <View style={styles.headerText}>
            <Text style={styles.appName}>PersonalAI</Text>
            <Text style={styles.appSubtitle}>
              Your little AI companion 💜
            </Text>
          </View>
        </View>

        {/* Create new chat */}
        <Pressable
          style={({ pressed }) => [
            styles.newChatButton,
            pressed && styles.pressed,
          ]}
          onPress={() => void handleCreateChat()}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Text style={styles.newChatIcon}>＋</Text>
              <Text style={styles.newChatText}>New Chat</Text>
            </>
          )}
        </Pressable>

        {/* History title */}
        <Text style={styles.sectionTitle}>CHAT HISTORY</Text>

        {isLoading ? (
          <ActivityIndicator
            style={styles.loader}
            color={colors.primary}
          />
        ) : chats.length === 0 ? (
          <Text style={styles.emptyText}>
            ยังไม่มีประวัติแชต
          </Text>
        ) : (
          <View style={styles.chatList}>
            {chats.map((chat) => {
              const isActive = chat.id === activeChatId;

              return (
                <View
                  key={chat.id}
                  style={[
                    styles.chatItem,
                    isActive && styles.activeChatItem,
                  ]}
                >
                  <Pressable
                    style={styles.chatSelect}
                    onPress={() => openChat(chat)}
                  >
                    <Text style={styles.chatIcon}>◌</Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.chatTitle,
                        isActive && styles.activeChatTitle,
                      ]}
                    >
                      {chat.title}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.actionButton}
                    onPress={() => openRenameModal(chat)}
                    accessibilityRole="button"
                    accessibilityLabel={`Rename ${chat.title}`}
                    hitSlop={6}
                  >
                    <Text style={styles.actionIcon}>✎</Text>
                  </Pressable>

                  <Pressable
                    style={styles.actionButton}
                    onPress={() => handleDeleteChat(chat)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${chat.title}`}
                    hitSlop={6}
                  >
                    <Text style={styles.deleteIcon}>×</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Other pages */}
        <View style={styles.divider} />

        <Pressable
          style={styles.pageButton}
          onPress={() => navigateTo('Memory')}
        >
          <Text style={styles.pageIcon}>♡</Text>
          <Text style={styles.pageText}>My Memories</Text>
        </Pressable>

        <Pressable
          style={styles.pageButton}
          onPress={() => navigateTo('Settings')}
        >
          <Text style={styles.pageIcon}>⚙</Text>
          <Text style={styles.pageText}>Settings</Text>
        </Pressable>
      </DrawerContentScrollView>

      {/* Rename modal */}
      <Modal
        visible={editingChat !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingChat(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              เปลี่ยนชื่อห้องแชต
            </Text>

            <TextInput
              style={styles.titleInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="ชื่อห้องแชต"
              placeholderTextColor={colors.textSecondary}
              maxLength={80}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={() => void handleRenameChat()}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setEditingChat(null)}
                disabled={isSavingTitle}
              >
                <Text style={styles.cancelText}>ยกเลิก</Text>
              </Pressable>

              <Pressable
                style={styles.saveButton}
                onPress={() => void handleRenameChat()}
                disabled={isSavingTitle}
              >
                {isSavingTitle ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.saveText}>บันทึก</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },

  logoText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },

  headerText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  appName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },

  appSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },

  newChatButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },

  newChatIcon: {
    color: colors.background,
    fontSize: 24,
    fontWeight: '600',
  },

  newChatText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.75,
  },

  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
  },

  loader: {
    marginTop: spacing.xl,
  },

  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },

  chatList: {
    gap: spacing.xs,
  },

  chatItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingLeft: spacing.sm,
  },

  activeChatItem: {
    backgroundColor: colors.surfaceElevated,
  },

  chatSelect: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  chatIcon: {
    color: colors.secondary,
    fontSize: 21,
  },

  chatTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },

  activeChatTitle: {
    color: colors.text,
    fontWeight: '600',
  },

  actionButton: {
    width: 30,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionIcon: {
    color: colors.textSecondary,
    fontSize: 19,
  },

  deleteIcon: {
    color: colors.error,
    fontSize: 24,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },

  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },

  pageIcon: {
    color: colors.primary,
    fontSize: 21,
    width: 24,
    textAlign: 'center',
  },

  pageText: {
    color: colors.text,
    fontSize: 14,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },

  titleInput: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  cancelButton: {
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },

  cancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },

  saveButton: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  saveText: {
    color: colors.background,
    fontWeight: '700',
  },
});