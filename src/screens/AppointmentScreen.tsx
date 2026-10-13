import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/theme';
import DrawerBTN from '../components/DrawerBTN';
import {
  getAllAppointments,
  type Appointment,
} from '../storage/appointmentStorage';
import {
  availableAppointmentStatuses,
  appointmentStatusLabel,
  formatAppointmentDate,
  formatAppointmentTime,
  inputDate,
  inputTime,
  parseLocalDate,
  persistAppointment,
  persistAppointmentStatus,
  removeAppointment,
} from '../services/process/appointment';
import styles from '../styles/AppointmentScreen';

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

    const draft = { title, startAt, endAt, location, notes };
    setIsSaving(true);
    try {
      const updated = await persistAppointment(editingAppointment, draft);
      if (updated) {
        setSelectedAppointment(updated);
        setDetailsVisible(true);
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
    const choices = availableAppointmentStatuses(appointment)
      .filter((status) => status !== appointment.status)
      .map((status) => ({
        text: appointmentStatusLabel(status),
        onPress: () => {
          void persistAppointmentStatus(appointment.id, status)
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
          void removeAppointment(appointment.id)
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
    <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.screen}>
        <View style={styles.header}>
          <DrawerBTN />
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
                    {appointmentStatusLabel(appointment.status)}
                    </Text>
                </View>
                <Text style={styles.cardDate}>{formatAppointmentDate(appointment.startAt)}</Text>
                <Text style={styles.cardTime}>
                    {formatAppointmentTime(appointment.startAt)} - {formatAppointmentTime(appointment.endAt)}
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
                    {formatAppointmentDate(selectedAppointment.startAt)} · {formatAppointmentTime(selectedAppointment.startAt)} - {formatAppointmentTime(selectedAppointment.endAt)}
                </Text>
                <Text style={styles.detailLabel}>สถานะ</Text>
                  <Text style={styles.detailValue}>{appointmentStatusLabel(selectedAppointment.status)}</Text>
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
    </SafeAreaView>
  );
}
