import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '../styles/theme';
import {
  createAppointment,
  deleteAppointment,
  getAllAppointments,
  setAppointmentStatus,
  updateAppointment,
  type Appointment,
  type AppointmentDraft,
  type AppointmentStatus,
} from '../storage/appointmentStorage';

function inputDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function inputTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function parseLocalDate(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  if (
    value.getFullYear() !== year || value.getMonth() !== month - 1 ||
    value.getDate() !== day || value.getHours() !== hour || value.getMinutes() !== minute
  ) return null;

  return value;
}

function statusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'completed': return 'นัดหมายเสร็จสิ้น';
    case 'cancelled': return 'ยกเลิกนัดหมาย';
    default: return 'ยังไม่เสร็จสิ้น';
  }
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AppointmentScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(inputDate(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setAppointments(await getAllAppointments());
    } catch (error) {
      console.error('Failed to load appointments:', error);
      Alert.alert('โหลดนัดหมายไม่สำเร็จ', 'โปรดลองเปิดหน้านี้อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));

  const openCreate = () => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    setEditingAppointment(null);
    setTitle('');
    setEventDate(inputDate(start));
    setStartTime(inputTime(start));
    setEndTime(inputTime(end));
    setLocation('');
    setNotes('');
    setEditorVisible(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setTitle(appointment.title);
    setEventDate(inputDate(appointment.startAt));
    setStartTime(inputTime(appointment.startAt));
    setEndTime(inputTime(appointment.endAt));
    setLocation(appointment.location);
    setNotes(appointment.notes);
    setEditorVisible(true);
  };

  const saveAppointment = async () => {
    const startAt = parseLocalDate(eventDate, startTime);
    const endAt = parseLocalDate(eventDate, endTime);
    if (!title.trim() || !startAt || !endAt || endAt <= startAt) {
      Alert.alert('ข้อมูลไม่ถูกต้อง', 'กรอกหัวข้อ วันที่ และเวลาเริ่ม/สิ้นสุดให้ถูกต้อง');
      return;
    }

    const draft: AppointmentDraft = { title, startAt, endAt, location, notes };
    setIsSaving(true);
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, draft);
        const updated: Appointment = {
          ...editingAppointment,
          ...draft,
          status: editingAppointment.status === 'completed' && endAt.getTime() > Date.now()
            ? 'pending'
            : editingAppointment.status,
          updatedAt: Date.now(),
        };
        setSelectedAppointment(updated);
        setDetailsVisible(true);
      } else {
        await createAppointment(draft);
      }
      setEditorVisible(false);
      await reload();
    } catch (error) {
      console.error('Failed to save appointment:', error);
      Alert.alert('บันทึกไม่สำเร็จ', error instanceof Error ? error.message : 'โปรดลองอีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = (appointment: Appointment) => {
    const canComplete = appointment.endAt.getTime() <= Date.now();
    const statuses: AppointmentStatus[] = [
      'pending',
      ...(canComplete ? ['completed' as const] : []),
      'cancelled',
    ];
    const choices = statuses
      .filter((status) => status !== appointment.status)
      .map((status) => ({
        text: statusLabel(status),
        onPress: () => {
          void setAppointmentStatus(appointment.id, status)
            .then(reload)
            .catch((error: unknown) => {
              console.error('Failed to update appointment status:', error);
              Alert.alert('เปลี่ยนสถานะไม่สำเร็จ', error instanceof Error ? error.message : 'โปรดลองอีกครั้ง');
            });
        },
      }));

    Alert.alert('เปลี่ยนสถานะนัดหมาย', appointment.title, [
      ...choices,
      { text: 'ยกเลิก', style: 'cancel' },
    ]);
  };

  const confirmDelete = (appointment: Appointment) => {
    Alert.alert('ลบนัดหมาย', `ต้องการลบ “${appointment.title}” หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: () => {
          void deleteAppointment(appointment.id)
            .then(() => {
              if (selectedAppointment?.id === appointment.id) {
                setDetailsVisible(false);
                setSelectedAppointment(null);
              }
              return reload();
            })
            .catch((error: unknown) => {
              console.error('Failed to delete appointment:', error);
              Alert.alert('ลบไม่สำเร็จ', 'โปรดลองอีกครั้ง');
            });
        },
      },
    ]);
  };

  const openDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsVisible(true);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PERSONAL APPOINTMENTS</Text>
          <Text style={styles.title}>การนัดหมาย</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={openCreate}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Text style={styles.addButtonText}>＋ เพิ่ม</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {isLoading ? (
          <Text style={styles.emptyText}>กำลังโหลดนัดหมาย...</Text>
        ) : appointments.length === 0 ? (
          <Text style={styles.emptyText}>ยังไม่มีนัดหมาย</Text>
        ) : appointments.map((appointment) => (
          <View key={appointment.id} style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`ดูรายละเอียด ${appointment.title}`}
              onPress={() => openDetails(appointment)}
              style={({ pressed }) => [styles.cardContent, pressed && styles.pressed]}
            >
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={2}>{appointment.title}</Text>
                <Text style={[
                  styles.status,
                  appointment.status === 'completed' && styles.statusCompleted,
                  appointment.status === 'cancelled' && styles.statusCancelled,
                ]}>
                  {statusLabel(appointment.status)}
                </Text>
              </View>
              <Text style={styles.cardDate}>{formatDate(appointment.startAt)}</Text>
              <Text style={styles.cardTime}>
                {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}
              </Text>
            </Pressable>
            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => changeStatus(appointment)}
                style={({ pressed }) => [styles.statusButton, pressed && styles.pressed]}
              >
                <Text style={styles.statusButtonText}>เปลี่ยนสถานะ</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`ลบ ${appointment.title}`}
                onPress={() => confirmDelete(appointment)}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
              >
                <Text style={styles.deleteButtonText}>ลบ</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {detailsVisible && selectedAppointment && !editorVisible && (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>รายละเอียดนัดหมาย</Text>
              <Pressable onPress={() => setDetailsVisible(false)} accessibilityRole="button">
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.detailsContent}>
              <Text style={styles.detailTitle}>{selectedAppointment.title}</Text>
              <Text style={styles.detailLabel}>วันและเวลา</Text>
              <Text style={styles.detailValue}>
                {formatDate(selectedAppointment.startAt)} · {formatTime(selectedAppointment.startAt)} - {formatTime(selectedAppointment.endAt)}
              </Text>
              <Text style={styles.detailLabel}>สถานะ</Text>
              <Text style={styles.detailValue}>{statusLabel(selectedAppointment.status)}</Text>
              <Text style={styles.detailLabel}>สถานที่</Text>
              <Text style={styles.detailValue}>{selectedAppointment.location || 'ไม่ระบุ'}</Text>
              <Text style={styles.detailLabel}>รายละเอียด</Text>
              <Text style={styles.detailValue}>{selectedAppointment.notes || 'ไม่มีรายละเอียดเพิ่มเติม'}</Text>
            </ScrollView>
            <Pressable
              style={styles.saveButton}
              onPress={() => openEdit(selectedAppointment)}
              accessibilityRole="button"
            >
              <Text style={styles.saveButtonText}>แก้ไขรายละเอียด</Text>
            </Pressable>
          </View>
        </View>
      )}

      {editorVisible && (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingAppointment ? 'แก้ไขนัดหมาย' : 'นัดหมายใหม่'}</Text>
              <Pressable onPress={() => setEditorVisible(false)} accessibilityRole="button">
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>หัวข้อ</Text>
              <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="หัวข้อนัดหมาย" placeholderTextColor={colors.textSecondary} />
              <Text style={styles.fieldLabel}>วันที่ (YYYY-MM-DD)</Text>
              <TextInput value={eventDate} onChangeText={setEventDate} style={styles.input} placeholder="2026-10-13" placeholderTextColor={colors.textSecondary} />
              <View style={styles.timeFields}>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>เวลาเริ่ม</Text>
                  <TextInput value={startTime} onChangeText={setStartTime} style={styles.input} placeholder="10:00" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>เวลาสิ้นสุด</Text>
                  <TextInput value={endTime} onChangeText={setEndTime} style={styles.input} placeholder="10:30" placeholderTextColor={colors.textSecondary} />
                </View>
              </View>
              <Text style={styles.fieldLabel}>สถานที่</Text>
              <TextInput value={location} onChangeText={setLocation} style={styles.input} placeholder="ไม่ระบุ" placeholderTextColor={colors.textSecondary} />
              <Text style={styles.fieldLabel}>รายละเอียด</Text>
              <TextInput value={notes} onChangeText={setNotes} style={[styles.input, styles.notesInput]} placeholder="รายละเอียดเพิ่มเติม" placeholderTextColor={colors.textSecondary} multiline />
            </ScrollView>
            <Pressable
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={() => void saveAppointment()}
              disabled={isSaving}
              accessibilityRole="button"
            >
              <Text style={styles.saveButtonText}>{isSaving ? 'กำลังบันทึก...' : 'บันทึกนัดหมาย'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  eyebrow: { color: colors.secondary, fontSize: 10, fontWeight: '700' },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.xs },
  addButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  addButtonText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: 14, paddingVertical: spacing.xl, textAlign: 'center' },
  card: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: { gap: spacing.xs },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  status: {
    flexShrink: 1,
    overflow: 'hidden',
    color: colors.textSecondary,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 10,
    fontWeight: '600',
  },
  statusCompleted: { color: colors.background, backgroundColor: colors.success },
  statusCancelled: { color: colors.background, backgroundColor: colors.error },
  cardDate: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.xs },
  cardTime: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: spacing.md },
  statusButtonText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  deleteButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: spacing.md },
  deleteButtonText: { color: colors.error, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.72 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    maxHeight: '92%',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  closeText: { color: colors.textSecondary, fontSize: 28, lineHeight: 30, paddingHorizontal: spacing.sm },
  detailsContent: { paddingBottom: spacing.md },
  detailTitle: { color: colors.text, fontSize: 21, fontWeight: '700', marginBottom: spacing.md },
  detailLabel: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.md },
  detailValue: { color: colors.text, fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    minHeight: 44,
    color: colors.text,
    backgroundColor: colors.input,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timeFields: { flexDirection: 'row', gap: spacing.md },
  timeField: { flex: 1 },
  notesInput: { minHeight: 88, textAlignVertical: 'top' },
  saveButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  saveButtonText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
});
