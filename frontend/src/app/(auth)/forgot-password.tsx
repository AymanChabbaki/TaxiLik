import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { Spacing, Type } from '@/lib/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(value);
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.sendFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScaffold
      title={t('forgotPw.title')}
      subtitle={sent ? t('forgotPw.sent', { email: email.trim().toLowerCase() }) : t('forgotPw.subtitle')}
      footer={
        <Pressable onPress={() => router.back()} style={styles.link}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common.back')}</Text>
          </Text>
        </Pressable>
      }
    >
      {!sent ? (
        <>
          <TextField
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={(v) => { setEmail(v); if (error) setError(null); }}
            error={error ?? undefined}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
            leading={<Ionicons name="mail-outline" size={20} color={colors.textMuted} />}
          />
          <Button label={t('forgotPw.send')} onPress={onSubmit} loading={loading} />
        </>
      ) : (
        <Button
          label={t('resetPw.title')}
          onPress={() => router.replace({ pathname: '/(auth)/reset-password', params: { email: email.trim().toLowerCase() } })}
        />
      )}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  link: { alignItems: 'center', paddingVertical: Spacing.sm },
  linkText: { ...Type.bodyMd },
});
