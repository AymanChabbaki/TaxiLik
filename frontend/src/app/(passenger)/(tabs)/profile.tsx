import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarPicker } from '@/components/AvatarPicker';
import { Button } from '@/components/Button';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const s = useStyles();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);

  async function onSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      setSaved(true);
    } catch {
      Alert.alert('TaxiLik.ma', t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.titleRow}>
          <Text style={s.title}>{t('profile.title')}</Text>
          <Pressable style={s.iconBtn} onPress={() => router.push('/(passenger)/settings')}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={s.identity}>
          <AvatarPicker size={96} />
          <Text style={s.email}>{user?.email}</Text>
          <Text style={s.roleBadge}>{t('auth.passenger')}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('profile.information')}</Text>
          <View style={s.form}>
            <TextField label={t('auth.fullName')} placeholder={t('auth.namePlaceholder')} value={fullName} onChangeText={(v) => { setFullName(v); setSaved(false); }} leading={<Ionicons name="person-outline" size={20} color={colors.textMuted} />} />
            <TextField label={t('auth.phone')} placeholder={t('auth.phonePlaceholder')} keyboardType="phone-pad" value={phone} onChangeText={(v) => { setPhone(v); setSaved(false); }} leading={<Ionicons name="call-outline" size={20} color={colors.textMuted} />} />
            <Button label={saved ? t('common.saved') : t('common.save')} onPress={onSave} loading={saving} size="md" />
          </View>
        </View>

        <Pressable style={s.menuLink} onPress={() => setChangePwOpen(true)}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.text} />
          <Text style={s.menuLinkText}>{t('changePw.title')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <Pressable style={s.menuLink} onPress={() => router.push('/(passenger)/menu')}>
          <Ionicons name="menu" size={20} color={colors.text} />
          <Text style={s.menuLinkText}>{t('menu.title')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </ScrollView>

      <ChangePasswordModal visible={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </SafeAreaView>
  );
}

function useStyles() {
  return useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.margin, gap: Spacing.lg },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...Type.headlineXl, color: c.text },
    iconBtn: { width: 42, height: 42, borderRadius: Radius.full, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    identity: { alignItems: 'center', gap: Spacing.xs },
    avatar: { width: 80, height: 80, borderRadius: Radius.full, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: c.onPrimary, fontSize: 30, fontWeight: '800' },
    email: { ...Type.labelLg, color: c.text },
    roleBadge: { ...Type.labelSm, color: c.primary, backgroundColor: c.primaryContainer, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, overflow: 'hidden' },
    section: { gap: Spacing.sm },
    sectionLabel: { ...Type.labelSm, color: c.textMuted, marginLeft: Spacing.xs },
    form: { gap: Spacing.md },
    menuLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md },
    menuLinkText: { ...Type.labelLg, color: c.text, flex: 1 },
  }));
}
