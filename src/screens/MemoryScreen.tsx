
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../styles/theme';

import {
  createMemory,
  deleteMemory,
  getAllMemories,
  updateMemory,
  type Memory,
  type MemoryCategory,
} from '../storage/memoryStorage';

const CATEGORY_OPTIONS: {
  value: MemoryCategory;
  label: string;
}[] = [
  { value: 'project', label: 'โปรเจกต์' },
  { value: 'preference', label: 'ความชอบ' },
  { value: 'goal', label: 'เป้าหมาย' },
  { value: 'general', label: 'ทั่วไป' },
];

function getCategoryLabel(category: MemoryCategory) {
  return (
    CATEGORY_OPTIONS.find((item) => item.value === category)
      ?.label ?? 'ทั่วไป'
  );
}

export default function MemoryScreen() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMemory, setEditingMemory] =
    useState<Memory | null>(null);
  const [content, setContent] = useState('');
  const [category, setCategory] =
    useState<MemoryCategory>('general');

  const loadMemories = useCallback(async () => {
    try {
      const result = await getAllMemories();
      setMemories(result);
    } catch (error) {
      console.error('Failed to load memories:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'โหลดความจำไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  function openCreateModal() {
    setEditingMemory(null);
    setContent('');
    setCategory('general');
    setIsModalVisible(true);
  }

  function openEditModal(memory: Memory) {
    setEditingMemory(memory);
    setContent(memory.content);
    setCategory(memory.category);
    setIsModalVisible(true);
  }

  async function handleSave() {
    if (!content.trim()) {
      Alert.alert('ยังไม่มีเนื้อหา', 'กรุณากรอกสิ่งที่ต้องการจำ');
      return;
    }

    setIsSaving(true);

    try {
      if (editingMemory) {
        await updateMemory(
          editingMemory.id,
          content,
          category,
        );
      } else {
        await createMemory(content, category);
      }

      setIsModalVisible(false);
      await loadMemories();
    } catch (error) {
      console.error('Failed to save memory:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'บันทึกความจำไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete(memory: Memory) {
    Alert.alert(
      'ลบความจำนี้?',
      'เมื่อลบแล้ว ข้อมูลนี้จะถูกนำออกจากฐานข้อมูล',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteMemory(memory.id);
                await loadMemories();
              } catch (error) {
                console.error('Failed to delete memory:', error);
                Alert.alert(
                  'เกิดข้อผิดพลาด',
                  'ลบความจำไม่สำเร็จ',
                );
              }
            })();
          },
        },
      ],
    );
  }

  function renderMemory({ item }: { item: Memory }) {
    return (
      <View style={styles.memoryCard}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {getCategoryLabel(item.category)}
            </Text>
          </View>

          <View style={styles.cardActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="แก้ไขความจำ"
              hitSlop={8}
              onPress={() => openEditModal(item)}
              style={styles.actionButton}
            >
              <Text style={styles.editText}>แก้ไข</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ลบความจำ"
              hitSlop={8}
              onPress={() => confirmDelete(item)}
              style={styles.actionButton}
            >
              <Text style={styles.deleteText}>ลบ</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.memoryContent}>{item.content}</Text>

        <Text style={styles.dateText}>
          แก้ไขล่าสุด{' '}
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.title}>My Memories</Text>
            <Text style={styles.description}>
              จัดการสิ่งที่ PersonalAI ควรจดจำ
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={openCreateModal}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ เพิ่ม</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />
        ) : (
          <FlatList
            data={memories}
            keyExtractor={(item) => item.id}
            renderItem={renderMemory}
            contentContainerStyle={
              memories.length === 0
                ? styles.emptyList
                : styles.listContent
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>✧</Text>
                <Text style={styles.emptyTitle}>
                  ยังไม่มีความจำ
                </Text>
                <Text style={styles.emptyDescription}>
                  เพิ่มข้อมูลที่ต้องการให้ PersonalAI จดจำได้ที่นี่
                </Text>
              </View>
            }
          />
        )}

        <Modal
          visible={isModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {editingMemory ? 'แก้ไขความจำ' : 'เพิ่มความจำ'}
              </Text>

              <Text style={styles.inputLabel}>เนื้อหา</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="เช่น กำลังพัฒนาโปรเจกต์ PersonalAI"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                style={styles.contentInput}
              />

              <Text style={styles.inputLabel}>หมวดหมู่</Text>
              <View style={styles.categoryOptions}>
                {CATEGORY_OPTIONS.map((option) => {
                  const selected = category === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setCategory(option.value)}
                      style={[
                        styles.categoryOption,
                        selected && styles.categoryOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          selected && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  disabled={isSaving}
                  onPress={() => setIsModalVisible(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>ยกเลิก</Text>
                </Pressable>

                <Pressable
                  disabled={isSaving}
                  onPress={() => void handleSave()}
                  style={[
                    styles.saveButton,
                    isSaving && styles.disabledButton,
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={styles.saveText}>บันทึก</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  heading: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addButtonText: {
    color: colors.background,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loader: {
    marginTop: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 44,
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptyDescription: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  memoryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.xs,
  },
  editText: {
    color: colors.primary,
    fontWeight: '600',
  },
  deleteText: {
    color: colors.error,
    fontWeight: '600',
  },
  memoryContent: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  contentInput: {
    backgroundColor: colors.input,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 120,
    maxHeight: 220,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  categoryOption: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  categoryOptionTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  saveText: {
    color: colors.background,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
