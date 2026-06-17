import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { LogoImage } from '@/components/Logo';
import { ThemeModeToggle } from '@/components/ThemeModeToggle';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { disconnectSocket } from '@/lib/socket';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

export default function AdminHome() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.margin },
    iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' },
    title: { ...Type.headlineLg, color: c.text },
    text: { ...Type.bodyMd, color: c.textSecondary, textAlign: 'center' },
    block: { alignSelf: 'stretch', gap: Spacing.sm },
    label: { ...Type.labelSm, color: c.textMuted, marginLeft: Spacing.xs },
  }));

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <LogoImage width={200} />
        <View style={s.iconWrap}>
          <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
        </View>
        <Text style={s.title}>{t('admin.title')}</Text>
        <Text style={s.text}>
          {t('admin.hello', { name: user?.fullName || user?.email || '' })} {t('admin.body')}
        </Text>

        <View style={s.block}>
          <Text style={s.label}>{t('settings.appearance')}</Text>
          <ThemeModeToggle />
        </View>
        <View style={s.block}>
          <Text style={s.label}>{t('settings.language')}</Text>
          <LanguageToggle />
        </View>

        <Button
          label={t('settings.logout')}
          variant="outline"
          style={{ alignSelf: 'stretch' }}
          onPress={async () => {
            disconnectSocket();
            await signOut();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
