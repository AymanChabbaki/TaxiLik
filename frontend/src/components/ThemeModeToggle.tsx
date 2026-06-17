import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useTheme, useThemedStyles, type ThemeMode } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

const OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Système', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Clair', icon: 'sunny-outline' },
  { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
];

export function ThemeModeToggle() {
  const { mode, setMode, colors } = useTheme();
  const s = useThemedStyles((c) => ({
    container: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: Radius.md,
      padding: Spacing.xs,
      gap: Spacing.xs,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.sm + 2,
    },
    segmentActive: { backgroundColor: c.surface },
    label: { ...Type.labelMd, color: c.textSecondary },
    labelActive: { color: c.text },
  }));

  return (
    <View style={s.container}>
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => setMode(opt.value)}
            style={[s.segment, active && s.segmentActive]}
          >
            <Ionicons name={opt.icon} size={16} color={active ? colors.primary : colors.textMuted} />
            <Text style={[s.label, active && s.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
