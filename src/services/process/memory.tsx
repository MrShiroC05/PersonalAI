import {
  createMemory,
  deleteMemory,
  updateMemory,
  type Memory,
  type MemoryCategory,
} from '../../storage/memoryStorage';

export const MEMORY_CATEGORY_OPTIONS: {
  value: MemoryCategory;
  label: string;
}[] = [
  { value: 'project', label: 'โปรเจกต์' },
  { value: 'preference', label: 'ความชอบ' },
  { value: 'goal', label: 'เป้าหมาย' },
  { value: 'general', label: 'ทั่วไป' },
];

export function memoryCategoryLabel(category: MemoryCategory): string {
  return MEMORY_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? 'ทั่วไป';
}

export async function persistMemory(
  current: Memory | null,
  content: string,
  category: MemoryCategory,
): Promise<void> {
  if (!content.trim()) throw new Error('กรุณากรอกสิ่งที่ต้องการจำ');

  if (current) {
    await updateMemory(current.id, content, category);
  } else {
    await createMemory(content, category);
  }
}

export function removeMemory(id: string): Promise<void> {
  return deleteMemory(id);
}