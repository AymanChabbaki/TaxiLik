import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import type { TranslationKey } from '@/lib/translations';

const FAQ: { q: TranslationKey; a: TranslationKey }[] = [
  { q: 'help.q1', a: 'help.a1' },
  { q: 'help.q2', a: 'help.a2' },
  { q: 'help.q3', a: 'help.a3' },
  { q: 'help.q4', a: 'help.a4' },
];

export default function HelpScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState<number | null>(0);
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.margin, gap: Spacing.sm },
    subtitle: { ...Type.bodyMd, color: c.textSecondary, marginBottom: Spacing.sm },
    item: { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md },
    qRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    q: { ...Type.labelLg, color: c.text, flex: 1 },
    a: { ...Type.bodyMd, color: c.textSecondary, marginTop: Spacing.sm },
  }));

  return (
    <View style={s.safe}>
      <PageHeader title={t('help.title')} />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.subtitle}>{t('help.subtitle')}</Text>
        {FAQ.map((item, i) => {
          const expanded = open === i;
          return (
            <Pressable key={item.q} style={s.item} onPress={() => setOpen(expanded ? null : i)}>
              <View style={s.qRow}>
                <Text style={s.q}>{t(item.q)}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </View>
              {expanded ? <Text style={s.a}>{t(item.a)}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
