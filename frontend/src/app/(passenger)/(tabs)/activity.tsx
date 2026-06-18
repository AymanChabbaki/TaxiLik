import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { formatMAD, getRideHistory } from '@/lib/rides';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import type { Ride } from '@/lib/types';

export default function ActivityScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    title: { ...Type.headlineXl, color: c.text, paddingHorizontal: Spacing.margin, paddingTop: Spacing.sm },
    card: { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: Spacing.sm },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
    dest: { ...Type.labelLg, color: c.text, flex: 1 },
    price: { ...Type.labelLg, color: c.primary },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
    from: { ...Type.labelSm, color: c.textSecondary, flex: 1 },
    badge: { ...Type.labelSm, fontWeight: '700' },
    starsRow: { flexDirection: 'row', gap: 2 },
    empty: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xxl },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    emptyText: { ...Type.bodyMd, color: c.textMuted },
  }));
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setLoading(true);
      getRideHistory(token).then(({ rides }) => setRides(rides)).catch(() => {}).finally(() => setLoading(false));
    }, [token])
  );

  const badgeColor = (status: string) =>
    status === 'completed' ? colors.success : ['cancelled', 'expired'].includes(status) ? colors.error : colors.warning;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Text style={s.title}>{t('activity.title')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r._id}
          contentContainerStyle={{ padding: Spacing.margin, gap: Spacing.sm }}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="time-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={s.emptyText}>{t('activity.empty')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.dest} numberOfLines={1}>{item.destination.address}</Text>
                <Text style={s.price}>{formatMAD(item.fare.total)}</Text>
              </View>
              <View style={s.cardBottom}>
                <Text style={s.from} numberOfLines={1}>{t('activity.from', { address: item.pickup.address })}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.passengerRating?.stars ? (
                    <View style={s.starsRow}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons
                          key={n}
                          name={n <= item.passengerRating!.stars ? 'star' : 'star-outline'}
                          size={12}
                          color={colors.warning}
                        />
                      ))}
                    </View>
                  ) : null}
                  <Text style={[s.badge, { color: badgeColor(item.status) }]}>{t(`rstatus.${item.status}` as any)}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
