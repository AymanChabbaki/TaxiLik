import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { Spacing, Type } from '@/lib/theme';
import { useThemedStyles } from '@/lib/theme-context';
import type { TranslationKey } from '@/lib/translations';

const DOCS: Record<string, { title: TranslationKey; body: TranslationKey }> = {
  terms: { title: 'legal.terms.title', body: 'legal.terms.body' },
  privacy: { title: 'legal.privacy.title', body: 'legal.privacy.body' },
  licenses: { title: 'legal.licenses.title', body: 'legal.licenses.body' },
};

export default function LegalDocScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { t } = useI18n();
  const entry = DOCS[String(doc)] ?? DOCS.terms;
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.margin, paddingBottom: Spacing.xxl },
    body: { ...Type.bodyMd, color: c.textSecondary, lineHeight: 24 },
  }));

  return (
    <View style={s.safe}>
      <PageHeader title={t(entry.title)} />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.body}>{t(entry.body)}</Text>
      </ScrollView>
    </View>
  );
}
