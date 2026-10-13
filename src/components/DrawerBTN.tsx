import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Pressable, Text } from 'react-native';
import type { RootDrawerParamList } from '../navigation/AppNavigator';
import { sharedStyles } from '../styles/styles';

export default function DrawerBTN() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

  return (
    <Pressable
      style={({ pressed }) => [sharedStyles.drawerButton, pressed && sharedStyles.pressed]}
      onPress={() => navigation.openDrawer()}
      accessibilityRole="button"
      accessibilityLabel="Open navigation menu"
    >
      <Text style={sharedStyles.drawerIcon}>☰</Text>
    </Pressable>
  );
}