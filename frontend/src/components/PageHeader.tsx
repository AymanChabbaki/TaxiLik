import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

export function PageHeader({ title }: { title: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useThemedStyles((c) => ({
    safe: { backgroundColor: c.background },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.margin,
      paddingVertical: Spacing.sm,
    },
    back: {
      width: 42,
      height: 42,
      borderRadius: Radius.full,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { ...Type.headlineMd, color: c.text, flex: 1 },
  }));

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <View style={s.bar}>
        <Pressable style={s.back} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.title}>{title}</Text>
      </View>
    </SafeAreaView>
  );
}
