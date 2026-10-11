import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, spacing } from '../styles/theme';

// Component
import Appointment from '../components/Appointment';

export default function AppointmentScreen() {
  return (
    <View>
        <Text>การนัดหมาย</Text>
        {/* container */}
        <View>
            <Appointment id="1" Topic="Meeting with John" Date="2023-10-15" />
            <Appointment id="2" Topic="Dentist Appointment" Date="2023-10-16" />
        </View>
    </View>
    );
}

