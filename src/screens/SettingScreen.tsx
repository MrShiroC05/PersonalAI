import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../styles/theme';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚙</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.description}>
        ตั้งค่าบุคลิก AI ธีม และการเชื่อมต่อโมเดล
      </Text>
      <Text style={styles.note}>
        Settings coming soon
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
    fontSize: 48,
    color: colors.primary,
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
    textAlign: 'center',
    marginTop: spacing.md,
  },
  note: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: spacing.lg,
  },
});