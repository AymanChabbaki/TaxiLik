import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { rateRide } from '@/lib/rides';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import type { Ride } from '@/lib/types';

interface Props {
  ride: Ride;
  token: string;
  onDone: () => void;
}

export function RatingModal({ ride, token, onDone }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = useStyles();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (stars === 0) return;
    setSubmitting(true);
    try {
      await rateRide(token, ride._id, stars, comment.trim() || undefined);
    } catch {
      // best-effort — even on error, dismiss so the user isn't stuck
    } finally {
      setSubmitting(false);
      onDone();
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onDone}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>{t('rating.title')}</Text>
          <Text style={s.subtitle}>{t('rating.driver')}</Text>

          <View style={s.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={8}>
                <Ionicons
                  name={n <= stars ? 'star' : 'star-outline'}
                  size={40}
                  color={n <= stars ? colors.warning : colors.border}
                />
              </Pressable>
            ))}
          </View>

          <TextInput
            style={s.input}
            placeholder={t('rating.placeholder')}
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
            maxLength={300}
            multiline
          />

          <Pressable
            style={[s.btn, stars === 0 && s.btnDisabled]}
            onPress={onSubmit}
            disabled={stars === 0 || submitting}
          >
            <Text style={s.btnText}>{t('rating.submit')}</Text>
          </Pressable>

          <Pressable style={s.skip} onPress={onDone}>
            <Text style={s.skipText}>{t('rating.skip')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function useStyles() {
  return useThemedStyles((c) => ({
    backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      padding: Spacing.margin,
      paddingBottom: Spacing.xxl,
      gap: Spacing.md,
      alignItems: 'center',
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border },
    title: { ...Type.headlineMd, color: c.text, textAlign: 'center' },
    subtitle: { ...Type.labelLg, color: c.textSecondary, textAlign: 'center' },
    stars: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm },
    input: {
      width: '100%',
      backgroundColor: c.surfaceAlt,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.md,
      ...Type.bodyMd,
      color: c.text,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    btn: {
      width: '100%',
      backgroundColor: c.primary,
      borderRadius: Radius.full,
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    btnDisabled: { opacity: 0.4 },
    btnText: { ...Type.labelLg, color: c.onPrimary, fontWeight: '700' },
    skip: { paddingVertical: Spacing.sm },
    skipText: { ...Type.labelMd, color: c.textMuted },
  }));
}
