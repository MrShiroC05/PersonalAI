import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export type CalendarEvent = Calendar.ExpoCalendarEvent;

export type CalendarDraft = {
  calendarId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  notes: string;
};

export async function requestCalendarAccess(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('ปฏิทินของเครื่องรองรับบน iOS และ Android เท่านั้น');
  }

  const permission = await Calendar.requestCalendarPermissions(false);

  if (!permission.granted) {
    throw new Error('กรุณาอนุญาตให้แอปเข้าถึงปฏิทินก่อน');
  }
}

export async function getDeviceCalendars() {
  await requestCalendarAccess();
  return Calendar.getCalendars(Calendar.EntityTypes.EVENT);
}

export async function getEventsForMonth(
  calendars: Calendar.ExpoCalendar[],
  year: number,
  month: number,
): Promise<CalendarEvent[]> {
  const events = await Calendar.listEvents(
    calendars,
    new Date(year, month, 1),
    new Date(year, month + 1, 1),
  );

  return events.sort(
    (left, right) =>
      new Date(left.startDate).getTime() -
      new Date(right.startDate).getTime(),
  );
}

export async function createDeviceEvent(
  draft: CalendarDraft,
): Promise<CalendarEvent> {
  const calendar = await Calendar.ExpoCalendar.get(draft.calendarId);

  return calendar.createEvent({
    title: draft.title,
    startDate: draft.startDate,
    endDate: draft.endDate,
    location: draft.location || undefined,
    notes: draft.notes,
  });
}

export async function updateDeviceEvent(
  eventId: string,
  draft: Omit<CalendarDraft, 'calendarId'>,
): Promise<void> {
  const event = await Calendar.ExpoCalendarEvent.get(eventId);

  await event.update({
    title: draft.title,
    startDate: draft.startDate,
    endDate: draft.endDate,
    location: draft.location || null,
    notes: draft.notes,
  });
}

export async function deleteDeviceEvent(eventId: string): Promise<void> {
  const event = await Calendar.ExpoCalendarEvent.get(eventId);
  await event.delete();
}