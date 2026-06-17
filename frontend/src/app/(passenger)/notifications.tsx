import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

export default function NotificationsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.margin },
    iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    text: { ...Type.bodyMd, color: c.textMuted, textAlign: 'center' },
  }));
  return (
    <View style={s.safe}>
      <PageHeader title={t('notifications.title')} />
      <View style={s.empty}>
        <View style={s.iconWrap}>
          <Ionicons name="notifications-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={s.text}>{t('notifications.empty')}</Text>
      </View>
    </View>
  );
}
