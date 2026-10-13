import { Alert } from 'react-native';

import { sendToAI } from '../ai/aiservice';
import type { AIMessage, CalendarAction } from '../ai/types';
import {
	createAppointment,
	deleteAppointment,
	getAllAppointments,
	updateAppointment,
} from '../../storage/appointmentStorage';
import { getAllMemories } from '../../storage/memoryStorage';
import { getDatabase } from '../../storage/database';
import {
	createChat,
	getAllChats,
	getChatById,
} from '../../storage/chatStorage';
import { getMessagesByChatId } from '../../storage/messageStorage';

export async function loadChatSession(requestedChatId?: string) {
	await getDatabase();

	let chat = requestedChatId ? await getChatById(requestedChatId) : null;
	if (!chat) {
		const chats = await getAllChats();
		chat = chats[0] ?? (await createChat());
	}

	return {
		chat,
		messages: await getMessagesByChatId(chat.id),
	};
}

function toLocalDateTime(value: Date): string {
	const pad = (part: number) => String(part).padStart(2, '0');
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function localDateTimeNow(): string {
	return toLocalDateTime(new Date());
}

async function buildAppointmentsContext() {
	const now = new Date();
	const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	rangeStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));
	const rangeEnd = new Date(rangeStart);
	rangeEnd.setDate(rangeEnd.getDate() + 90);

	const appointments = (await getAllAppointments())
		.filter((appointment) => appointment.endAt >= rangeStart && appointment.startAt < rangeEnd)
		.sort((left, right) => left.startAt.getTime() - right.startAt.getTime());

	return {
		rangeStart: toLocalDateTime(rangeStart),
		rangeEnd: toLocalDateTime(rangeEnd),
		truncated: appointments.length > 25,
		appointments: appointments.slice(0, 25).map((appointment) => ({
			title: appointment.title.slice(0, 100),
			startAt: toLocalDateTime(appointment.startAt),
			endAt: toLocalDateTime(appointment.endAt),
			status: appointment.status,
		})),
	};
}

export async function generateChatReply(
	previousMessages: AIMessage[],
	userText: string,
) {
	const savedMemories = await getAllMemories();
	const memoryContext = savedMemories
		.slice(0, 10)
		.map((memory, index) => `${index + 1}. [${memory.category}] ${memory.content}`)
		.join('\n')
		.slice(0, 5000);
	const appointmentsContext = await buildAppointmentsContext();

	return sendToAI({
		messages: [...previousMessages, { role: 'user', content: userText }],
		memoryContext,
		appointmentsContext,
		calendarContext: {
			localDateTime: localDateTimeNow(),
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
		},
	}, 'online');
}

function parseActionDate(value: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
	if (!match) return null;

	const [, year, month, day, hour, minute, second = '0'] = match;
	const parsed = new Date(
		Number(year), Number(month) - 1, Number(day),
		Number(hour), Number(minute), Number(second),
	);
	if (
		parsed.getFullYear() !== Number(year) ||
		parsed.getMonth() !== Number(month) - 1 ||
		parsed.getDate() !== Number(day) ||
		parsed.getHours() !== Number(hour) ||
		parsed.getMinutes() !== Number(minute)
	) return null;

	return parsed;
}

export async function proposeAppointmentAction(action?: CalendarAction): Promise<void> {
	if (!action || action.kind === 'none') return;

	try {
		if (action.kind === 'create') {
			const startAt = parseActionDate(action.startAt);
			const endAt = parseActionDate(action.endAt);
			if (!action.title.trim() || !startAt || !endAt || endAt <= startAt) {
				Alert.alert('นัดหมายยังไม่ครบ', 'AI ยังระบุชื่อหรือช่วงเวลาได้ไม่ชัดเจน กรุณาระบุรายละเอียดเพิ่ม');
				return;
			}

			Alert.alert(
				'ยืนยันเพิ่มนัดหมาย',
				`${action.title}\n${startAt.toLocaleString('th-TH')} - ${endAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
				[
					{ text: 'ยกเลิก', style: 'cancel' },
					{
						text: 'บันทึก',
						onPress: () => {
							void createAppointment({
								title: action.title.trim(),
								startAt,
								endAt,
								location: action.location,
								notes: action.notes,
							}).catch((error) => {
								console.error('AI appointment create failed:', error);
								Alert.alert('บันทึกไม่สำเร็จ', 'ไม่สามารถบันทึกนัดหมายลงในแอปได้');
							});
						},
					},
				],
			);
			return;
		}

		const targetStartAt = parseActionDate(action.targetStartAt);
		if (!action.targetTitle.trim() || !targetStartAt) {
			Alert.alert('ระบุนัดหมายไม่ชัดเจน', 'กรุณาบอกชื่อนัดหมายและวันที่หรือเวลาเดิมให้ชัดเจนก่อน');
			return;
		}

		const appointments = await getAllAppointments();
		const matches = appointments.filter((appointment) =>
			appointment.title.trim().toLocaleLowerCase() === action.targetTitle.trim().toLocaleLowerCase() &&
			appointment.startAt.getFullYear() === targetStartAt.getFullYear() &&
			appointment.startAt.getMonth() === targetStartAt.getMonth() &&
			appointment.startAt.getDate() === targetStartAt.getDate() &&
			appointment.startAt.getHours() === targetStartAt.getHours() &&
			appointment.startAt.getMinutes() === targetStartAt.getMinutes(),
		);

		if (matches.length !== 1) {
			Alert.alert(
				matches.length === 0 ? 'ไม่พบนัดหมาย' : 'พบนัดหมายมากกว่าหนึ่งรายการ',
				'ไม่ได้เปลี่ยนแปลงรายการ กรุณาระบุชื่อและวันของนัดหมายให้ชัดเจน หรือจัดการจากหน้าการนัดหมาย',
			);
			return;
		}

		const appointment = matches[0];
		if (action.kind === 'delete') {
			Alert.alert(
				'ยืนยันลบนัดหมาย',
				`${appointment.title}\n${appointment.startAt.toLocaleString('th-TH')}`,
				[
					{ text: 'ยกเลิก', style: 'cancel' },
					{
						text: 'ลบ',
						style: 'destructive',
						onPress: () => {
							void deleteAppointment(appointment.id).catch((error) => {
								console.error('AI appointment delete failed:', error);
								Alert.alert('ลบไม่สำเร็จ', 'ไม่สามารถลบนัดหมายออกจากแอปได้');
							});
						},
					},
				],
			);
			return;
		}

		const startAt = action.startAt ? parseActionDate(action.startAt) : appointment.startAt;
		const endAt = action.endAt ? parseActionDate(action.endAt) : appointment.endAt;
		if (!startAt || !endAt || endAt <= startAt) {
			Alert.alert('เวลาใหม่ไม่ถูกต้อง', 'ไม่ได้เปลี่ยนแปลงนัดหมาย กรุณาระบุเวลาเริ่มและสิ้นสุดให้ถูกต้อง');
			return;
		}

		const updated = {
			title: action.title.trim() || appointment.title,
			startAt,
			endAt,
			location: action.location || appointment.location,
			notes: action.notes || appointment.notes,
		};
		Alert.alert(
			'ยืนยันแก้ไขนัดหมาย',
			`${appointment.title} → ${updated.title}\n${startAt.toLocaleString('th-TH')} - ${endAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
			[
				{ text: 'ยกเลิก', style: 'cancel' },
				{
					text: 'บันทึกการแก้ไข',
					onPress: () => {
						void updateAppointment(appointment.id, updated).catch((error) => {
							console.error('AI appointment update failed:', error);
							Alert.alert('แก้ไขไม่สำเร็จ', 'ไม่สามารถแก้ไขนัดหมายในแอปได้');
						});
					},
				},
			],
		);
	} catch (error) {
		console.error('Failed to prepare AI appointment action:', error);
		Alert.alert('จัดการนัดหมายไม่ได้', 'โปรดลองอีกครั้ง');
	}
}
