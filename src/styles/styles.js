import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from './theme';

export const sharedStyles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.primary,
	},
	pageContainer: {
		flex: 1,
		backgroundColor: colors.background,
		padding: spacing.lg,
	},
	pageTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: colors.text,
	},
	pageDescription: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: spacing.xs,
	},
	drawerButton: {
		width: 42,
		height: 42,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: radius.md,
		backgroundColor: colors.surfaceElevated,
	},
	drawerIcon: {
		color: colors.primary,
		fontSize: 23,
	},
	surfaceCard: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.md,
		padding: spacing.md,
	},
	pressed: {
		opacity: 0.72,
	},
	disabled: {
		opacity: 0.6,
	},
});
