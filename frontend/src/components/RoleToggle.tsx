import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

interface Props {
  value: 'passenger' | 'driver';
  onChange: (role: 'passenger' | 'driver') => void;
}

const OPTIONS: { value: 'passenger' | 'driver'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'passenger', label: 'Passager', icon: 'person-outline' },
  { value: 'driver', label: 'Chauffeur', icon: 'car-outline' },
];

export function RoleToggle({ value, onChange }: Props) {
  const { colors } = useTheme();
  const s = useThemedStyles((c) => ({
    container: { flexDirection: 'row', gap: Spacing.sm },
    card: {
      flex: 1,
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    cardActive: { borderColor: c.primary, backgroundColor: c.primaryContainer },
    label: { ...Type.labelMd, color: c.textSecondary },
    labelActive: { color: c.primary },
  }));

  return (
    <View style={s.container}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[s.card, active && s.cardActive]}
          >
            <Ionicons
              name={opt.icon}
              size={24}
              color={active ? colors.primary : colors.textMuted}
            />
            <Text style={[s.label, active && s.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
