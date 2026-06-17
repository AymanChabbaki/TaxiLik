import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/Logo';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

export function AuthScaffold({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    topbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.margin,
      paddingTop: Spacing.sm,
    },
    back: {
      width: 42,
      height: 42,
      borderRadius: Radius.full,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { flexGrow: 1, padding: Spacing.margin, gap: Spacing.lg },
    header: { gap: Spacing.xs, marginTop: Spacing.sm },
    title: { ...Type.headlineXl, color: c.text },
    subtitle: { ...Type.bodyMd, color: c.textSecondary },
    footer: { paddingHorizontal: Spacing.margin, paddingBottom: Spacing.md },
  }));

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.topbar}>
        <Pressable style={s.back} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Wordmark size={18} />
        <View style={{ width: 42 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}
