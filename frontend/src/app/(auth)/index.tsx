import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { LogoImage } from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Spacing, Type } from '@/lib/theme';
import type { TranslationKey } from '@/lib/translations';

const PERKS: { icon: keyof typeof Ionicons.glyphMap; key: TranslationKey }[] = [
  { icon: 'shield-checkmark', key: 'welcome.perk1' },
  { icon: 'flash', key: 'welcome.perk2' },
  { icon: 'navigate', key: 'welcome.perk3' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { flex: 1, padding: Spacing.margin, justifyContent: 'space-between' },
    hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
    title: { ...Type.display, color: c.text, textAlign: 'center' },
    accent: { color: c.primary },
    subtitle: { ...Type.bodyLg, color: c.textSecondary, textAlign: 'center', maxWidth: 320 },
    perks: { gap: Spacing.sm, alignSelf: 'stretch', marginBottom: Spacing.lg },
    perk: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    perkIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    perkText: { ...Type.bodyMd, color: c.textSecondary, flex: 1 },
    actions: { gap: Spacing.sm },
    legal: { ...Type.labelSm, color: c.textMuted, textAlign: 'center', marginTop: Spacing.sm },
  }));

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <View style={s.hero}>
          <LogoImage width={240} />
          <Text style={s.title}>{t('welcome.title', { city: t('welcome.city') })}</Text>
          <Text style={s.subtitle}>{t('welcome.subtitle')}</Text>
        </View>

        <View style={s.perks}>
          {PERKS.map((p) => (
            <View key={p.key} style={s.perk}>
              <View style={s.perkIcon}>
                <Ionicons name={p.icon} size={18} color={colors.primary} />
              </View>
              <Text style={s.perkText}>{t(p.key)}</Text>
            </View>
          ))}
        </View>

        <View style={s.actions}>
          <Button label={t('welcome.createAccount')} onPress={() => router.push('/(auth)/register')} />
          <Button label={t('welcome.login')} variant="outline" onPress={() => router.push('/(auth)/login')} />
          <Text style={s.legal}>{t('welcome.footer')}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
