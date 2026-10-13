import {
	createAppointment,
	deleteAppointment,
	setAppointmentStatus,
	updateAppointment,
	type Appointment,
	type AppointmentDraft,
	type AppointmentStatus,
} from '../../storage/appointmentStorage';

export function inputDate(value: Date): string {
	return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function inputTime(value: Date): string {
	return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function parseLocalDate(date: string, time: string): Date | null {
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

export function appointmentStatusLabel(status: AppointmentStatus): string {
	switch (status) {
		case 'completed': return 'นัดหมายเสร็จสิ้น';
		case 'cancelled': return 'ยกเลิกนัดหมาย';
		default: return 'ยังไม่เสร็จสิ้น';
	}
}

export function formatAppointmentDate(value: Date): string {
	return value.toLocaleDateString('th-TH', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

export function formatAppointmentTime(value: Date): string {
	return value.toLocaleTimeString('th-TH', {
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function availableAppointmentStatuses(appointment: Appointment): AppointmentStatus[] {
	return [
		'pending',
		...(appointment.endAt.getTime() <= Date.now() ? ['completed' as const] : []),
		'cancelled',
	];
}

export async function persistAppointment(
	current: Appointment | null,
	draft: AppointmentDraft,
): Promise<Appointment | null> {
	if (!current) {
		await createAppointment(draft);
		return null;
	}

	await updateAppointment(current.id, draft);
	return {
		...current,
		...draft,
		status: current.status === 'completed' && draft.endAt.getTime() > Date.now()
			? 'pending'
			: current.status,
		updatedAt: Date.now(),
	};
}

export function persistAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
	return setAppointmentStatus(id, status);
}

export function removeAppointment(id: string): Promise<void> {
	return deleteAppointment(id);
}
