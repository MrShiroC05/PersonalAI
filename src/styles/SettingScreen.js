import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from './theme';
import { sharedStyles } from './styles';

const styles = StyleSheet.create({
  screen: sharedStyles.screen,
  container: sharedStyles.pageContainer,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  heading: { flex: 1 },
  title: { ...sharedStyles.pageTitle, fontSize: 22 },
  description: { ...sharedStyles.pageDescription, fontSize: 14, marginTop: spacing.md },
  permissionSection: {
    ...sharedStyles.surfaceCard,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  permissionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  permissionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default styles;