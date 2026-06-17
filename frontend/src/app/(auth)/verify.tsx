import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyEmail, resendOtp } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(30);

  const s = useThemedStyles((c) => ({
    cells: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.sm },
    cell: {
      flex: 1,
      aspectRatio: 0.82,
      maxWidth: 54,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
    },
    cellFilled: { borderColor: c.primary, backgroundColor: c.surface },
    cellText: { ...Type.headlineLg, color: c.text },
    hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
    error: { ...Type.labelMd, color: c.error },
    center: { alignItems: 'center', paddingVertical: Spacing.sm },
    resend: { ...Type.labelMd, color: c.primary },
    resendOff: { ...Type.labelMd, color: c.textMuted },
  }));

  useEffect(() => {
    const t = setInterval(() => setResendIn((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  async function onVerify(value = code) {
    if (value.length !== CODE_LENGTH) {
      setError(t('verify.enterCode'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyEmail(String(email), value);
      // Root navigator redirects to the right group on auth state change.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('verify.failed'));
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendIn > 0) return;
    try {
      await resendOtp(String(email));
      setResendIn(30);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.sendFailed'));
    }
  }

  const digits = code.padEnd(CODE_LENGTH, ' ').split('');

  return (
    <AuthScaffold
      title={t('verify.title')}
      subtitle={t('verify.subtitle', { email: String(email) })}
    >
      <Pressable style={s.cells} onPress={() => inputRef.current?.focus()}>
        {digits.map((d, i) => (
          <View key={i} style={[s.cell, i === code.length && s.cellFilled, d.trim() && s.cellFilled]}>
            <Text style={s.cellText}>{d.trim()}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(t) => {
          const next = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
          setCode(next);
          if (error) setError(null);
          if (next.length === CODE_LENGTH) onVerify(next);
        }}
        keyboardType="number-pad"
        autoFocus
        maxLength={CODE_LENGTH}
        style={s.hidden}
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Button label={t('verify.verify')} onPress={() => onVerify()} loading={loading} />

      <Pressable onPress={onResend} disabled={resendIn > 0} style={s.center}>
        <Text style={resendIn > 0 ? s.resendOff : s.resend}>
          {resendIn > 0 ? t('verify.resendIn', { s: resendIn }) : t('verify.resend')}
        </Text>
      </Pressable>
    </AuthScaffold>
  );
}
