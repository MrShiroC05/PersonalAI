import {
  Button,
  Text,
  View,
} from 'react-native';

import { colors, spacing } from '../styles/theme';

export default function Appointment({ id, Topic, Date }: { id: string; Topic: string; Date: string }) {
    return (
        <View>
            <Text>{Topic}</Text>
            <Text>{Date}</Text>
            <Button title="View Details" onPress={() => { console.log(id) }} />
        </View>
    );
}