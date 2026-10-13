
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DrawerBTN from '../components/DrawerBTN';

import { colors } from '../styles/theme';

import {
  getAllMemories,
  type Memory,
  type MemoryCategory,
} from '../storage/memoryStorage';
import {
  MEMORY_CATEGORY_OPTIONS,
  memoryCategoryLabel,
  persistMemory,
  removeMemory,
} from '../services/process/memory';
import styles from '../styles/MemoryScreen';

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
      await persistMemory(editingMemory, content, category);

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
                await removeMemory(memory.id);
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
              {memoryCategoryLabel(item.category)}
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
          <DrawerBTN />
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
                {MEMORY_CATEGORY_OPTIONS.map((option) => {
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
