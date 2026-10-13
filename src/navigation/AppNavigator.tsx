import React from 'react';
import {
  createDrawerNavigator,
} from '@react-navigation/drawer';

import ChatScreen from '../screens/ChatScreen';
import AppointmentScreen from '../screens/AppointmentScreen';
import MemoryScreen from '../screens/MemoryScreen';
import SettingsScreen from '../screens/SettingScreen';
import ChatHistoryDrawer from '../components/ChatHistoryDrawer';

import { colors } from '../styles/theme';

export type RootDrawerParamList = {
  Chat: { chatId?: string } | undefined;
  Appointments: undefined;
  Memory: undefined;
  Settings: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export default function AppNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Chat"
      drawerContent={(props) => (
        <ChatHistoryDrawer {...props} />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.6)',
        drawerStyle: {
          width: 310,
          backgroundColor: colors.background,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Chat',
        }}
      />

      <Drawer.Screen
        name="Appointments"
        component={AppointmentScreen}
        options={{
          title: 'Appointments',
        }}
      />

      <Drawer.Screen
        name="Memory"
        component={MemoryScreen}
        options={{
          title: 'My Memories',
        }}
      />

      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Drawer.Navigator>
  );
}