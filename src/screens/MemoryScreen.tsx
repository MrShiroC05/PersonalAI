import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../styles/theme';

export default function MemoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✧</Text>
      <Text style={styles.title}>My Memories</Text>
      <Text style={styles.description}>
        ความทรงจำของคุณจะปรากฏที่นี่
      </Text>
      <Text style={styles.note}>
        Memory management coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 52,
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  note: {
    fontSize: 12,
    color: colors.primary,
    marginTop: spacing.lg,
  },
});