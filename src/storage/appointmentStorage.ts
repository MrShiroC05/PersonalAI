import { getDatabase } from './database';

export type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

export type Appointment = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  location: string;
  notes: string;
  status: AppointmentStatus;
  createdAt: number;
  updatedAt: number;
};

export type AppointmentDraft = {
  title: string;
  startAt: Date;
  endAt: Date;
  location: string;
  notes: string;
};

type AppointmentRow = {
  id: string;
  title: string;
  startAt: number;
  endAt: number;
  location: string;
  notes: string;
  status: AppointmentStatus;
  createdAt: number;
  updatedAt: number;
};

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeDraft(draft: AppointmentDraft): AppointmentDraft {
  const title = draft.title.trim();
  if (!title) throw new Error('กรุณากรอกหัวข้อนัดหมาย');
  if (
    Number.isNaN(draft.startAt.getTime()) ||
    Number.isNaN(draft.endAt.getTime()) ||
    draft.endAt <= draft.startAt
  ) {
    throw new Error('วันและเวลานัดหมายไม่ถูกต้อง');
  }

  return {
    ...draft,
    title,
    location: draft.location.trim(),
    notes: draft.notes.trim(),
  };
}

function mapRow(row: AppointmentRow): Appointment {
  return {
    ...row,
    startAt: new Date(row.startAt),
    endAt: new Date(row.endAt),
  };
}

export async function getAllAppointments(): Promise<Appointment[]> {
  const db = await getDatabase();
  const now = Date.now();
  const rows = await db.getAllAsync<AppointmentRow>(
    `SELECT
      id, title,
      start_at AS startAt,
      end_at AS endAt,
      location, notes, status,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM appointments
    ORDER BY
      CASE WHEN start_at >= ? THEN 0 ELSE 1 END,
      CASE WHEN start_at >= ? THEN start_at END ASC,
      CASE WHEN start_at < ? THEN start_at END DESC`,
    now,
    now,
    now,
  );

  return rows.map(mapRow);
}

export async function createAppointment(
  draft: AppointmentDraft,
): Promise<Appointment> {
  const normalized = normalizeDraft(draft);
  const db = await getDatabase();
  const now = Date.now();
  const appointment: Appointment = {
    id: createId(),
    ...normalized,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO appointments (
      id, title, start_at, end_at, location, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    appointment.id,
    appointment.title,
    appointment.startAt.getTime(),
    appointment.endAt.getTime(),
    appointment.location,
    appointment.notes,
    appointment.status,
    now,
    now,
  );

  return appointment;
}

export async function updateAppointment(
  id: string,
  draft: AppointmentDraft,
): Promise<void> {
  const normalized = normalizeDraft(draft);
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE appointments
     SET title = ?, start_at = ?, end_at = ?, location = ?, notes = ?,
         status = CASE
           WHEN status = 'completed' AND ? > ? THEN 'pending'
           ELSE status
         END,
         updated_at = ?
     WHERE id = ?`,
    normalized.title,
    normalized.startAt.getTime(),
    normalized.endAt.getTime(),
    normalized.location,
    normalized.notes,
    normalized.endAt.getTime(),
    Date.now(),
    Date.now(),
    id,
  );
}

export async function setAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ endAt: number }>(
    'SELECT end_at AS endAt FROM appointments WHERE id = ?',
    id,
  );

  if (!row) throw new Error('ไม่พบนัดหมายนี้');
  if (status === 'completed' && row.endAt > Date.now()) {
    throw new Error('เปลี่ยนเป็นเสร็จสิ้นได้หลังเวลานัดหมายผ่านไปแล้ว');
  }

  await db.runAsync(
    'UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?',
    status,
    Date.now(),
    id,
  );
}

export async function deleteAppointment(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM appointments WHERE id = ?', id);
}