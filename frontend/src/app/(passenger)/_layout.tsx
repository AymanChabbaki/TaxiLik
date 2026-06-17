import { Stack } from 'expo-router';

import { useTheme } from '@/lib/theme-context';

// Stack wrapping the passenger tabs so menu screens (settings, safety, etc.)
// push on top of the tab bar.
export default function PassengerLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="menu" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="safety" />
      <Stack.Screen name="help" />
      <Stack.Screen name="support" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="legal/[doc]" />
    </Stack>
  );
}
