import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

export default function WalletScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    title: { ...Type.headlineXl, color: c.text, padding: Spacing.margin, paddingBottom: 0 },
    body: { padding: Spacing.margin, gap: Spacing.md },
    card: { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.lg, gap: Spacing.md },
    label: { ...Type.labelSm, color: c.textMuted },
    method: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    methodIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' },
    methodText: { ...Type.headlineMd, color: c.text },
    note: { ...Type.bodyMd, color: c.textSecondary },
  }));
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Text style={s.title}>{t('wallet.title')}</Text>
      <View style={s.body}>
        <View style={s.card}>
          <Text style={s.label}>{t('wallet.method')}</Text>
          <View style={s.method}>
            <View style={s.methodIcon}>
              <Ionicons name="cash-outline" size={24} color={colors.primary} />
            </View>
            <Text style={s.methodText}>{t('wallet.cash')}</Text>
          </View>
          <Text style={s.note}>{t('wallet.note')}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
