import { useCallback, useMemo, useState } from 'react';
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
import type { ExpoCalendar, ExpoCalendarEvent } from 'expo-calendar';

import { colors, radius, spacing } from '../styles/theme';
import {
  createDeviceEvent,
  deleteDeviceEvent,
  getDeviceCalendars,
  getEventsForMonth,
  type CalendarDraft,
  type CalendarEvent,
  updateDeviceEvent,
} from '../services/calendarService';

const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const monthNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatTime(value: string | Date): string {
  return asDate(value).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: Date): string {
  return `${value.getDate()} ${monthNames[value.getMonth()]}`;
}

function eventOccursOnDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1);
  const startsAt = asDate(event.startDate);
  const endsAt = asDate(event.endDate);
  return startsAt < dayEnd && endsAt > dayStart;
}

function inputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inputTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(
    value.getMinutes(),
  ).padStart(2, '0')}`;
}

function parseLocalDate(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const parsed = new Date(`${date}T${time}:00`);
  const [year, month, day] = date.split('-').map(Number);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export default function AppointmentScreen() {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const [calendars, setCalendars] = useState<ExpoCalendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExpoCalendarEvent | null>(null);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(inputDate(today));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const writableCalendars = useMemo(
    () => calendars.filter((calendar) => calendar.allowsModifications),
    [calendars],
  );

  const eventsForSelectedDay = useMemo(
    () => events.filter((event) => eventOccursOnDay(event, selectedDate)),
    [events, selectedDate],
  );

  const reload = useCallback(async (
    year = visibleMonth.getFullYear(),
    month = visibleMonth.getMonth(),
  ) => {
    setIsLoading(true);

    try {
      const deviceCalendars = await getDeviceCalendars();
      const visibleCalendars = deviceCalendars.filter(
        (calendar) => calendar.isVisible !== false,
      );
      setCalendars(visibleCalendars);
      setCalendarId((current) =>
        visibleCalendars.some((calendar) => calendar.id === current)
          ? current
          : (visibleCalendars.find((calendar) => calendar.allowsModifications && calendar.isPrimary)
              ?? visibleCalendars.find((calendar) => calendar.allowsModifications))?.id ?? '',
      );
      setEvents(
        await getEventsForMonth(
          visibleCalendars,
          year,
          month,
        ),
      );
    } catch (error) {
      console.error('Failed to load device calendar:', error);
      Alert.alert('เปิดปฏิทินไม่ได้', 'ตรวจสอบสิทธิ์ปฏิทินในการตั้งค่าเครื่องแล้วลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, [
    visibleMonth,
    setCalendarId,
    setCalendars,
    setEvents,
    setIsLoading,
  ]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const days = useMemo(() => {
    const firstDay = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );
    const offset = firstDay.getDay();

    return Array.from({ length: 42 }, (_, index) =>
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
        index - offset + 1,
      ),
    );
  }, [visibleMonth]);

  const openCreate = () => {
    const selectedWritableCalendar = writableCalendars.find(
      (calendar) => calendar.id === calendarId,
    ) ?? writableCalendars[0];

    if (!selectedWritableCalendar) {
      Alert.alert('ยังไม่มีปฏิทินที่แก้ไขได้', 'เพิ่มหรือเลือกปฏิทินที่เขียนได้ในการตั้งค่าเครื่อง');
      return;
    }

    setEditingEvent(null);
    setTitle('');
    setEventDate(inputDate(selectedDate));
    setStartTime('10:00');
    setEndTime('10:30');
    setLocation('');
    setNotes('');
    setCalendarId(selectedWritableCalendar.id);
    setEditorVisible(true);
  };

  const openEdit = (event: ExpoCalendarEvent) => {
    const startsAt = asDate(event.startDate);
    const endsAt = asDate(event.endDate);
    setEditingEvent(event);
    setTitle(event.title);
    setEventDate(inputDate(startsAt));
    setStartTime(inputTime(startsAt));
    setEndTime(inputTime(endsAt));
    setLocation(event.location ?? '');
    setNotes(event.notes ?? '');
    setEditorVisible(true);
  };

  const saveEvent = async () => {
    const normalizedTitle = title.trim();
    const startsAt = parseLocalDate(eventDate, startTime);
    const endsAt = parseLocalDate(eventDate, endTime);

    if (!normalizedTitle || !startsAt || !endsAt || endsAt <= startsAt) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรอกชื่อ วันที่ และเวลาสิ้นสุดให้ถูกต้อง');
      return;
    }

    setIsSaving(true);
    try {
      const draft: CalendarDraft = {
        calendarId: editingEvent?.calendarId ?? calendarId,
        title: normalizedTitle,
        startDate: startsAt,
        endDate: endsAt,
        location: location.trim(),
        notes: notes.trim(),
      };

      if (editingEvent) {
        await updateDeviceEvent(editingEvent.id, draft);
      } else {
        await createDeviceEvent(draft);
      }

      setEditorVisible(false);
      setVisibleMonth(new Date(startsAt.getFullYear(), startsAt.getMonth(), 1));
      setSelectedDate(new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate()));
      await reload(startsAt.getFullYear(), startsAt.getMonth());
    } catch (error) {
      console.error('Failed to save device calendar event:', error);
      Alert.alert('บันทึกไม่สำเร็จ', 'ปฏิทินนี้อาจไม่มีสิทธิ์แก้ไข');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (event: ExpoCalendarEvent) => {
    Alert.alert('ลบนัดหมาย', `ต้องการลบ “${event.title}” ออกจากปฏิทินหรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteDeviceEvent(event.id);
              await reload();
            } catch (error) {
              console.error('Failed to delete device calendar event:', error);
              Alert.alert('ลบไม่สำเร็จ', 'ปฏิทินนี้อาจไม่มีสิทธิ์แก้ไข');
            }
          })();
        },
      },
    ]);
  };

  const monthTitle = `${monthNames[visibleMonth.getMonth()]} ${visibleMonth.getFullYear() + 543}`;

  const changeMonth = (offset: number) => {
    const nextMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1,
    );
    setVisibleMonth(nextMonth);
    setSelectedDate(nextMonth);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PERSONAL CALENDAR</Text>
        <Text style={styles.title}>การนัดหมาย</Text>
      </View>

      <View style={styles.monthBar}>
        <Pressable
          style={styles.monthArrow}
          onPress={() => changeMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="เดือนก่อนหน้า"
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{monthTitle}</Text>
        <Pressable
          style={styles.monthArrow}
          onPress={() => changeMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="เดือนถัดไป"
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.calendar}>
        <View style={styles.weekRow}>
          {weekdays.map((day, index) => (
            <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>
          ))}
        </View>
        <View style={styles.dayGrid}>
          {days.map((day) => {
            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
            const isSelected = dateKey(day) === dateKey(selectedDate);
            const hasEvents = events.some(
              (event) => eventOccursOnDay(event, day),
            );

            return (
              <Pressable
                key={dateKey(day)}
                style={styles.dayCell}
                onPress={() => {
                  setSelectedDate(day);
                  if (!isCurrentMonth) {
                    setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`${day.getDate()} ${monthNames[day.getMonth()]}`}
              >
                <View style={[styles.dayNumber, isSelected && styles.selectedDay]}>
                  <Text style={[
                    styles.dayText,
                    !isCurrentMonth && styles.outsideMonthText,
                    isSelected && styles.selectedDayText,
                  ]}>{day.getDate()}</Text>
                </View>
                <View style={[styles.eventDot, hasEvents && styles.eventDotVisible]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.agendaHeader}>
        <View>
          <Text style={styles.agendaEyebrow}>AGENDA</Text>
          <Text style={styles.agendaTitle}>{formatDate(selectedDate)}</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openCreate} accessibilityRole="button">
          <Text style={styles.addButtonText}>＋ เพิ่ม</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.eventList}>
        {isLoading ? (
          <Text style={styles.emptyText}>กำลังโหลดปฏิทิน…</Text>
        ) : eventsForSelectedDay.length === 0 ? (
          <Text style={styles.emptyText}>วันนี้ยังไม่มีนัดหมาย</Text>
        ) : eventsForSelectedDay.map((event) => {
          const canEdit = writableCalendars.some(
            (calendar) => calendar.id === event.calendarId,
          ) && !event.recurrenceRule;

          return (
            <View key={`${event.calendarId}-${event.id}`} style={styles.eventRow}>
              <View style={styles.eventTimeColumn}>
                <Text style={styles.eventTime}>{formatTime(event.startDate)}</Text>
                <View style={styles.eventRule} />
              </View>
              <Pressable
                style={styles.eventContent}
                onPress={() => canEdit && openEdit(event)}
                accessibilityRole={canEdit ? 'button' : undefined}
              >
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>
                  {calendars.find((calendar) => calendar.id === event.calendarId)?.title ?? 'ปฏิทิน'}
                  {event.location ? ` · ${event.location}` : ''}
                </Text>
              </Pressable>
              {canEdit && (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(event)}
                  accessibilityRole="button"
                  accessibilityLabel={`ลบ ${event.title}`}
                >
                  <Text style={styles.deleteText}>×</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      {editorVisible && (
        <View style={styles.editorOverlay}>
          <View style={styles.editor}>
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>{editingEvent ? 'แก้ไขนัดหมาย' : 'นัดหมายใหม่'}</Text>
              <Pressable onPress={() => setEditorVisible(false)} accessibilityRole="button">
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>ชื่อ</Text>
              <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="ชื่อนัดหมาย" placeholderTextColor={colors.textSecondary} />
              <Text style={styles.fieldLabel}>วันที่ (YYYY-MM-DD)</Text>
              <TextInput value={eventDate} onChangeText={setEventDate} style={styles.input} placeholder="2026-10-13" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
              <View style={styles.timeFields}>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>เริ่ม (HH:mm)</Text>
                  <TextInput value={startTime} onChangeText={setStartTime} style={styles.input} placeholder="10:00" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>สิ้นสุด</Text>
                  <TextInput value={endTime} onChangeText={setEndTime} style={styles.input} placeholder="10:30" placeholderTextColor={colors.textSecondary} />
                </View>
              </View>
              <Text style={styles.fieldLabel}>สถานที่</Text>
              <TextInput value={location} onChangeText={setLocation} style={styles.input} placeholder="ไม่ระบุ" placeholderTextColor={colors.textSecondary} />
              <Text style={styles.fieldLabel}>บันทึกเพิ่มเติม</Text>
              <TextInput value={notes} onChangeText={setNotes} style={[styles.input, styles.notesInput]} placeholder="รายละเอียด" placeholderTextColor={colors.textSecondary} multiline />
              {!editingEvent && (
                <>
                  <Text style={styles.fieldLabel}>บันทึกลงปฏิทิน</Text>
                  <View style={styles.calendarChoices}>
                    {writableCalendars.map((calendar) => (
                      <Pressable
                        key={calendar.id}
                        style={[styles.calendarChoice, calendar.id === calendarId && styles.calendarChoiceSelected]}
                        onPress={() => setCalendarId(calendar.id)}
                      >
                        <Text style={[styles.calendarChoiceText, calendar.id === calendarId && styles.calendarChoiceSelectedText]}>{calendar.title}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
            <Pressable style={styles.saveButton} onPress={() => void saveEvent()} disabled={isSaving}>
              <Text style={styles.saveButtonText}>{isSaving ? 'กำลังบันทึก…' : 'บันทึกนัดหมาย'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  eyebrow: { color: colors.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 4 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  monthArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderRadius: radius.sm },
  arrowText: { color: colors.primary, fontSize: 28, lineHeight: 32 },
  monthTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  calendar: { marginHorizontal: spacing.md, paddingHorizontal: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  weekRow: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: spacing.sm, color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  selectedDay: { backgroundColor: colors.primary },
  dayText: { color: colors.text, fontSize: 13 },
  outsideMonthText: { color: colors.textSecondary, opacity: 0.5 },
  selectedDayText: { color: colors.background, fontWeight: '700' },
  eventDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: radius.full },
  eventDotVisible: { backgroundColor: colors.secondary },
  agendaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  agendaEyebrow: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  agendaTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 3 },
  addButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
  addButtonText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  eventList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: 14, paddingVertical: spacing.xl, textAlign: 'center' },
  eventRow: { flexDirection: 'row', alignItems: 'center', minHeight: 70, borderBottomWidth: 1, borderBottomColor: colors.border },
  eventTimeColumn: { width: 62, alignSelf: 'stretch', alignItems: 'flex-start', paddingTop: spacing.md },
  eventTime: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
  eventRule: { flex: 1, width: 1, marginLeft: 18, marginTop: spacing.xs, backgroundColor: colors.border },
  eventContent: { flex: 1, paddingVertical: spacing.md },
  eventTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  eventMeta: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
  deleteButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.error, fontSize: 24 },
  editorOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.58)' },
  editor: { maxHeight: '92%', padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.surface, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  editorTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  closeText: { color: colors.textSecondary, fontSize: 28, lineHeight: 30, paddingHorizontal: spacing.sm },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.md, marginBottom: spacing.xs },
  input: { minHeight: 44, color: colors.text, backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  timeFields: { flexDirection: 'row', gap: spacing.md },
  timeField: { flex: 1 },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  calendarChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  calendarChoice: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  calendarChoiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  calendarChoiceText: { color: colors.textSecondary, fontSize: 12 },
  calendarChoiceSelectedText: { color: colors.background, fontWeight: '700' },
  saveButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.sm },
  saveButtonText: { color: colors.background, fontSize: 14, fontWeight: '700' },
});

