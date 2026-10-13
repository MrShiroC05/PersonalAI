import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

export default function SettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.description}>การนัดหมายของคุณจัดเก็บไว้ในเครื่อง</Text>

      <View style={styles.permissionSection}>
        <Text style={styles.permissionTitle}>นัดหมาย</Text>
        <Text style={styles.permissionDescription}>
          บันทึกและจัดการนัดหมายใน SQLite ภายในแอป ไม่ต้องใช้สิทธิ์ปฏิทินของเครื่อง
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  permissionSection: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  permissionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});