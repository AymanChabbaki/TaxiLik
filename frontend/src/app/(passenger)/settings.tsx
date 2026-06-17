import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PageHeader } from '@/components/PageHeader';
import { ThemeModeToggle } from '@/components/ThemeModeToggle';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { disconnectSocket } from '@/lib/socket';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import type { TranslationKey } from '@/lib/translations';

const VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { signOut, deleteAccount } = useAuth();
  const router = useRouter();
  const s = useStyles();

  const legalDocs: { key: 'terms' | 'privacy' | 'licenses'; label: TranslationKey }[] = [
    { key: 'terms', label: 'settings.terms' },
    { key: 'privacy', label: 'settings.privacy' },
    { key: 'licenses', label: 'settings.licenses' },
  ];

  async function onLogout() {
    disconnectSocket();
    await signOut();
  }

  function confirmDelete() {
    const doDelete = async () => {
      try {
        disconnectSocket();
        await deleteAccount();
      } catch {
        Alert.alert(t('settings.deleteTitle'), t('settings.deleteError'));
      }
    };
    if (Platform.OS === 'web') {
      // Alert with buttons is limited on web; use confirm().
      if (typeof globalThis.confirm === 'function' && globalThis.confirm(t('settings.deleteMsg'))) doDelete();
      return;
    }
    Alert.alert(t('settings.deleteTitle'), t('settings.deleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.deleteConfirm'), style: 'destructive', onPress: doDelete },
    ]);
  }

  return (
    <View style={s.safe}>
      <PageHeader title={t('settings.title')} />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>{t('settings.appearance')}</Text>
        <ThemeModeToggle />

        <Text style={s.label}>{t('settings.language')}</Text>
        <LanguageToggle />

        <Text style={s.label}>{t('settings.legal')}</Text>
        <View style={s.group}>
          {legalDocs.map((doc, i) => (
            <Pressable
              key={doc.key}
              style={[s.row, i < legalDocs.length - 1 && s.rowBorder]}
              onPress={() => router.push({ pathname: '/(passenger)/legal/[doc]', params: { doc: doc.key } })}
            >
              <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
              <Text style={s.rowText}>{t(doc.label)}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>{t('settings.about')}</Text>
        <View style={s.group}>
          <View style={s.row}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={s.rowText}>{t('settings.appVersion')}</Text>
            <Text style={s.version}>{VERSION}</Text>
          </View>
        </View>

        <Text style={s.label}>{t('settings.account')}</Text>
        <Button label={t('settings.logout')} variant="outline" onPress={onLogout} />
        <Pressable style={s.delete} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={s.deleteText}>{t('settings.deleteAccount')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function useStyles() {
  return useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.margin, gap: Spacing.sm, paddingBottom: Spacing.xl },
    label: { ...Type.labelSm, color: c.textMuted, marginTop: Spacing.md, marginLeft: Spacing.xs },
    group: { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    rowText: { ...Type.bodyMd, color: c.text, fontWeight: '600', flex: 1 },
    version: { ...Type.labelMd, color: c.textMuted },
    delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, marginTop: Spacing.sm },
    deleteText: { ...Type.labelLg, color: c.error },
  }));
}
