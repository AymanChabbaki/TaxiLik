import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ visible, onClose }: Props) {
  const { changePassword } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const s = useThemedStyles((c) => ({
    backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.surface, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.margin, paddingBottom: Spacing.xl, gap: Spacing.md },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: Spacing.xs },
    title: { ...Type.headlineMd, color: c.text },
    error: { ...Type.labelMd, color: c.error },
  }));

  function reset() {
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setError(null);
  }

  function handleClose() {
    Keyboard.dismiss();
    reset();
    onClose();
  }

  async function onSubmit() {
    if (newPw.length < 8) { setError(t('changePw.tooShort')); return; }
    if (newPw !== confirmPw) { setError(t('changePw.mismatch')); return; }
    setError(null);
    Keyboard.dismiss();
    setLoading(true);
    try {
      await changePassword(currentPw, newPw);
      reset();
      onClose();
      Alert.alert('TaxiLik.ma', t('changePw.success'));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('changePw.wrongCurrent');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={s.backdrop} onPress={Keyboard.dismiss}>
          <Pressable style={s.sheet}>
            <View style={s.grabber} />
            <Text style={s.title}>{t('changePw.title')}</Text>

            <TextField
              label={t('changePw.current')}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              value={currentPw}
              onChangeText={(v) => { setCurrentPw(v); if (error) setError(null); }}
              leading={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
            />
            <TextField
              label={t('changePw.new')}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              value={newPw}
              onChangeText={(v) => { setNewPw(v); if (error) setError(null); }}
              leading={<Ionicons name="lock-open-outline" size={20} color={colors.textMuted} />}
            />
            <TextField
              label={t('changePw.confirm')}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              value={confirmPw}
              onChangeText={(v) => { setConfirmPw(v); if (error) setError(null); }}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
              leading={<Ionicons name="lock-open-outline" size={20} color={colors.textMuted} />}
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <Button label={t('changePw.submit')} onPress={onSubmit} loading={loading} />
            <Button label={t('common.cancel')} variant="ghost" onPress={handleClose} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
