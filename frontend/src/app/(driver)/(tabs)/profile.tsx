import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarPicker } from '@/components/AvatarPicker';
import { Button } from '@/components/Button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeModeToggle } from '@/components/ThemeModeToggle';
import { useAuth } from '@/lib/auth';
import { setStatus } from '@/lib/driver';
import { useI18n } from '@/lib/i18n';
import { disconnectSocket } from '@/lib/socket';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

export default function DriverProfile() {
  const { user, token, signOut } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = useStyles();

  async function onSignOut() {
    if (token) {
      try {
        await setStatus(token, false);
      } catch {
        /* ignore */
      }
    }
    disconnectSocket();
    await signOut();
  }

  const docs = user?.driver?.documents ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{t('dprofile.title')}</Text>

        <View style={s.identity}>
          <AvatarPicker size={96} />
          <Text style={s.name}>{user?.fullName || t('dprofile.role')}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={s.verified}>
            <Ionicons name="shield-checkmark" size={14} color={colors.success} />
            <Text style={s.verifiedText}>{t('dprofile.approved')}</Text>
          </View>
          <View style={s.ratingBadge}>
            {(user?.ratingCount ?? 0) > 0 ? (
              <>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= Math.round(user!.rating!) ? 'star' : 'star-outline'}
                    size={16}
                    color={colors.warning}
                  />
                ))}
                <Text style={s.ratingText}>
                  {(user!.rating!).toFixed(1)} · {user!.ratingCount} {t('dprofile.rating')}
                </Text>
              </>
            ) : (
              <Text style={s.ratingText}>{t('dprofile.noRating')}</Text>
            )}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>{t('dprofile.vehicle')}</Text>
          <View style={s.group}>
            <View style={s.rowItem}>
              <Text style={s.rowKey}>{t('dprofile.plate')}</Text>
              <Text style={s.rowVal}>{user?.driver?.vehicle?.plate || '—'}</Text>
            </View>
            <View style={[s.rowItem, s.rowBorder]}>
              <Text style={s.rowKey}>{t('dprofile.license')}</Text>
              <Text style={s.rowVal}>{user?.driver?.vehicle?.licenseNumber || '—'}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>{t('dprofile.documents')}</Text>
          <View style={s.group}>
            {docs.map((d, i) => (
              <View key={d.type} style={[s.rowItem, i < docs.length - 1 && s.rowBorder]}>
                <Text style={s.rowKey}>{t(`driver.onb.${d.type === 'carte_grise' ? 'carteGrise' : d.type === 'permis_confiance' ? 'confiance' : d.type}` as any)}</Text>
                <Ionicons name="checkmark-circle" size={18} color={d.status === 'approved' ? colors.success : colors.warning} />
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>{t('settings.appearance')}</Text>
          <ThemeModeToggle />
        </View>
        <View style={s.section}>
          <Text style={s.label}>{t('settings.language')}</Text>
          <LanguageToggle />
        </View>

        <Button label={t('settings.logout')} variant="outline" onPress={onSignOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

function useStyles() {
  return useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.margin, gap: Spacing.lg },
    title: { ...Type.headlineXl, color: c.text },
    identity: { alignItems: 'center', gap: Spacing.xs },
    avatar: { width: 80, height: 80, borderRadius: Radius.full, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: c.onPrimary, fontSize: 30, fontWeight: '800' },
    name: { ...Type.headlineMd, color: c.text },
    email: { ...Type.labelMd, color: c.textSecondary },
    verified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.surfaceAlt, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    verifiedText: { ...Type.labelSm, color: c.success },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { ...Type.labelSm, color: c.textSecondary },
    section: { gap: Spacing.sm },
    label: { ...Type.labelSm, color: c.textMuted, marginLeft: Spacing.xs },
    group: { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
    rowBorder: { borderTopWidth: 1, borderTopColor: c.border },
    rowKey: { ...Type.bodyMd, color: c.textSecondary },
    rowVal: { ...Type.labelLg, color: c.text },
  }));
}
