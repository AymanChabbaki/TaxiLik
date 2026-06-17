import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { RoleToggle } from '@/components/RoleToggle';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { Spacing, Type } from '@/lib/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();

  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordHint'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({ email: value, password, role, fullName: fullName.trim(), phone: phone.trim() });
      router.push({ pathname: '/(auth)/verify', params: { email: value } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScaffold
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      footer={
        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.link}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            {t('register.haveAccount')} <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('welcome.login')}</Text>
          </Text>
        </Pressable>
      }
    >
      <View style={{ gap: Spacing.xs }}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('register.iAm')}</Text>
        <RoleToggle value={role} onChange={setRole} />
      </View>

      <TextField
        label={t('auth.fullName')}
        placeholder={t('auth.namePlaceholder')}
        value={fullName}
        onChangeText={setFullName}
        leading={<Ionicons name="person-outline" size={20} color={colors.textMuted} />}
      />

      <TextField
        label={t('auth.phone')}
        placeholder={t('auth.phonePlaceholder')}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        leading={<Ionicons name="call-outline" size={20} color={colors.textMuted} />}
      />

      <TextField
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(null);
        }}
        leading={<Ionicons name="mail-outline" size={20} color={colors.textMuted} />}
      />

      <TextField
        label={t('auth.password')}
        placeholder={t('auth.passwordHint')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError(null);
        }}
        error={error ?? undefined}
        onSubmitEditing={onSubmit}
        returnKeyType="go"
        leading={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
      />

      <Button label={t('common.continue')} onPress={onSubmit} loading={loading} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  link: { alignItems: 'center', paddingVertical: Spacing.sm },
  linkText: { ...Type.bodyMd },
  fieldLabel: { ...Type.labelMd },
});
