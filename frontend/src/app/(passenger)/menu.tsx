import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import type { TranslationKey } from '@/lib/translations';

type Item = {
  icon: keyof typeof Ionicons.glyphMap;
  title: TranslationKey;
  sub: TranslationKey;
  href: Href;
};

const ITEMS: Item[] = [
  { icon: 'notifications-outline', title: 'menu.notifications', sub: 'menu.notificationsSub', href: '/(passenger)/notifications' },
  { icon: 'shield-checkmark-outline', title: 'menu.safety', sub: 'menu.safetySub', href: '/(passenger)/safety' },
  { icon: 'help-circle-outline', title: 'menu.help', sub: 'menu.helpSub', href: '/(passenger)/help' },
  { icon: 'chatbubbles-outline', title: 'menu.support', sub: 'menu.supportSub', href: '/(passenger)/support' },
  { icon: 'settings-outline', title: 'menu.settings', sub: 'menu.settingsSub', href: '/(passenger)/settings' },
];

export default function MenuScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.margin, gap: Spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.md,
    },
    icon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' },
    title: { ...Type.labelLg, color: c.text },
    sub: { ...Type.labelSm, color: c.textSecondary },
  }));

  return (
    <View style={s.safe}>
      <PageHeader title={t('menu.title')} />
      <ScrollView contentContainerStyle={s.list}>
        {ITEMS.map((item) => (
          <Pressable key={item.title} style={s.row} onPress={() => router.push(item.href)}>
            <View style={s.icon}>
              <Ionicons name={item.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{t(item.title)}</Text>
              <Text style={s.sub}>{t(item.sub)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
