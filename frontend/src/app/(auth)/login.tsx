import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { Spacing, Type } from '@/lib/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();

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
    if (!password) {
      setError(t('auth.loginFailed'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(value, password);
      // Root navigator redirects on auth state change.
    } catch (e) {
      // Unverified accounts: the backend re-sends a code; route to verify.
      if (e instanceof ApiError && (e.details as any)?.needsVerification) {
        router.push({ pathname: '/(auth)/verify', params: { email: value } });
        return;
      }
      setError(e instanceof ApiError ? e.message : t('auth.loginFailed'));
      setLoading(false);
    }
  }

  return (
    <AuthScaffold
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <Pressable onPress={() => router.replace('/(auth)/register')} style={styles.link}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            {t('login.noAccount')} <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('welcome.createAccount')}</Text>
          </Text>
        </Pressable>
      }
    >
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
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
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
      <Button label={t('welcome.login')} onPress={onSubmit} loading={loading} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  link: { alignItems: 'center', paddingVertical: Spacing.sm },
  linkText: { ...Type.bodyMd },
});
