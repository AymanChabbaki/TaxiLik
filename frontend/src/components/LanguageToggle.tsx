import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { LANGS, useI18n } from '@/lib/i18n';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const { colors } = useTheme();
  const s = useThemedStyles((c) => ({
    container: { gap: Spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    rowActive: { borderColor: c.primary, backgroundColor: c.primaryContainer },
    label: { ...Type.labelLg, color: c.text },
  }));

  return (
    <View style={s.container}>
      {LANGS.map((l) => {
        const active = lang === l.code;
        return (
          <Pressable key={l.code} onPress={() => setLang(l.code)} style={[s.row, active && s.rowActive]}>
            <Text style={s.label}>{l.native}</Text>
            {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
