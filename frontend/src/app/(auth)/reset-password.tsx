import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

const CODE_LENGTH = 6;

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { resetPassword, forgotPassword } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
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
    const id = setInterval(() => setResendIn((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  async function onSubmit() {
    if (code.length !== CODE_LENGTH) { setError(t('verify.enterCode')); return; }
    if (newPw.length < 8) { setError(t('resetPw.tooShort')); return; }
    if (newPw !== confirmPw) { setError(t('resetPw.mismatch')); return; }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(String(email), code, newPw);
      router.replace('/(auth)/login');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('verify.failed'));
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendIn > 0) return;
    try {
      await forgotPassword(String(email));
      setResendIn(30);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.sendFailed'));
    }
  }

  const digits = code.padEnd(CODE_LENGTH, ' ').split('');

  return (
    <AuthScaffold title={t('resetPw.title')} subtitle={t('resetPw.subtitle')}>
      {/* OTP cells */}
      <Pressable style={s.cells} onPress={() => inputRef.current?.focus()}>
        {digits.map((d, i) => (
          <View key={i} style={[s.cell, (i === code.length || d.trim()) && s.cellFilled]}>
            <Text style={s.cellText}>{d.trim()}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(v) => {
          const next = v.replace(/\D/g, '').slice(0, CODE_LENGTH);
          setCode(next);
          if (error) setError(null);
        }}
        keyboardType="number-pad"
        autoFocus
        maxLength={CODE_LENGTH}
        style={s.hidden}
      />

      <Pressable onPress={onResend} disabled={resendIn > 0} style={s.center}>
        <Text style={resendIn > 0 ? s.resendOff : s.resend}>
          {resendIn > 0 ? t('verify.resendIn', { s: resendIn }) : t('verify.resend')}
        </Text>
      </Pressable>

      {/* New password */}
      <TextField
        label={t('resetPw.newPw')}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        value={newPw}
        onChangeText={(v) => { setNewPw(v); if (error) setError(null); }}
        leading={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
      />
      <TextField
        label={t('resetPw.confirmPw')}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        value={confirmPw}
        onChangeText={(v) => { setConfirmPw(v); if (error) setError(null); }}
        error={error ?? undefined}
        onSubmitEditing={onSubmit}
        returnKeyType="go"
        leading={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
      />

      <Button label={t('resetPw.submit')} onPress={onSubmit} loading={loading} />
    </AuthScaffold>
  );
}
