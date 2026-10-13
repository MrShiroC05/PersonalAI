import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DrawerBTN from '../components/DrawerBTN';
import styles from '../styles/SettingScreen';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <DrawerBTN />
          <View style={styles.heading}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.description}>การนัดหมายของคุณจัดเก็บไว้ในเครื่อง</Text>
          </View>
        </View>

        <View style={styles.permissionSection}>
          <Text style={styles.permissionTitle}>นัดหมาย</Text>
          <Text style={styles.permissionDescription}>
            บันทึกและจัดการนัดหมายใน SQLite ภายในแอป ไม่ต้องใช้สิทธิ์ปฏิทินของเครื่อง
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
