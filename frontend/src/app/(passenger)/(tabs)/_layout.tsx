import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { Type } from '@/lib/theme';

export default function PassengerTabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { ...Type.labelSm },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.booking'),
          tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t('tab.activity'),
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tab.wallet'),
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
