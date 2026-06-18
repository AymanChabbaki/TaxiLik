import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CallOverlay } from '@/components/CallOverlay';
import { SplashLoader } from '@/components/SplashLoader';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CallProvider } from '@/lib/call';
import { I18nProvider } from '@/lib/i18n';
import { registerPushToken, setupNotificationHandler } from '@/lib/notifications';
import { ThemeProvider, useTheme } from '@/lib/theme-context';

setupNotificationHandler();

// Redirects between the (auth) group and the role-specific app group based on
// auth state. One codebase — the role only changes which group is shown.
function RootNavigator() {
  const { token, user, loading } = useAuth();
  const { colors, scheme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  // Keep the branded splash up on first launch for a minimum time so it's always
  // seen, then hide once auth has loaded.
  const [minSplash, setMinSplash] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setMinSplash(false), 2200);
    return () => clearTimeout(id);
  }, []);

  const isAuthed = !!token && !!user;
  const role = user?.role;

  useEffect(() => {
    if (token) registerPushToken(token);
  }, [token]);

  useEffect(() => {
    if (loading) return;
    const group = segments[0];

    if (!isAuthed) {
      if (group !== '(auth)') router.replace('/(auth)' as Href);
      return;
    }
    if (role === 'driver' && group !== '(driver)') {
      router.replace('/(driver)' as Href);
    } else if (role === 'passenger' && group !== '(passenger)') {
      router.replace('/(passenger)' as Href);
    } else if (role === 'admin' && group !== '(admin)') {
      router.replace('/(admin)' as Href);
    }
  }, [loading, isAuthed, role, segments, router]);

  if (loading) return <SplashLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(passenger)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="(admin)" />
      </Stack>
      {/* Branded splash held over the app on first launch until things settle. */}
      {minSplash ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <SplashLoader />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <CallProvider>
                <RootNavigator />
                <CallOverlay />
              </CallProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
