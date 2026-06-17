import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { Type } from '@/lib/theme';

export default function DriverTabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();

  // Gate: drivers must be approved before reaching the dashboard tabs.
  if (user?.driver?.approvalStatus !== 'approved') {
    return <Redirect href="/(driver)/onboarding" />;
  }

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
          title: t('dtab.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t('dtab.earnings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="cash" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t('dtab.activity'),
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('dtab.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
