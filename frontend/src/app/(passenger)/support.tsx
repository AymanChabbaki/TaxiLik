import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

const SUPPORT_EMAIL = 'support@taxilik.ma';
const SUPPORT_PHONE = '+212522000000';

export default function SupportScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.margin, gap: Spacing.md },
    subtitle: { ...Type.bodyMd, color: c.textSecondary },
    card: { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: Spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    icon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' },
    label: { ...Type.labelSm, color: c.textMuted },
    value: { ...Type.labelLg, color: c.text },
  }));

  return (
    <View style={s.safe}>
      <PageHeader title={t('support.title')} />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.subtitle}>{t('support.subtitle')}</Text>

        <View style={s.card}>
          <View style={s.row}>
            <View style={s.icon}><Ionicons name="mail-outline" size={22} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{t('support.email')}</Text>
              <Text style={s.value}>{SUPPORT_EMAIL}</Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={s.icon}><Ionicons name="call-outline" size={22} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{t('support.phone')}</Text>
              <Text style={s.value}>{SUPPORT_PHONE}</Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={s.icon}><Ionicons name="time-outline" size={22} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{t('support.hours')}</Text>
              <Text style={s.value}>{t('support.hoursValue')}</Text>
            </View>
          </View>
        </View>

        <Button label={t('support.sendEmail')} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} icon={<Ionicons name="mail" size={18} color={colors.onPrimary} />} />
        <Button label={t('support.callUs')} variant="outline" onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)} icon={<Ionicons name="call" size={18} color={colors.primary} />} />
      </ScrollView>
    </View>
  );
}
