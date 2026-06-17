import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { getDriverRides } from '@/lib/driver';
import { useI18n } from '@/lib/i18n';
import { formatMAD } from '@/lib/rides';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import type { Ride } from '@/lib/types';

// Platform commission the driver owes TaxiLik on completed rides.
const COMMISSION_RATE = 0.1; // 10%

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function DriverEarnings() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = useStyles();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setLoading(true);
      getDriverRides(token).then(({ rides }) => setRides(rides)).catch(() => {}).finally(() => setLoading(false));
    }, [token])
  );

  const completed = rides.filter((r) => r.status === 'completed');
  const today = startOfDay();
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const sum = (list: Ride[]) => list.reduce((a, r) => a + (r.fare?.total || 0), 0);
  const todayEarnings = sum(completed.filter((r) => new Date(r.createdAt) >= today));
  const weekEarnings = sum(completed.filter((r) => new Date(r.createdAt) >= weekAgo));
  const total = sum(completed);
  const weekCommission = Math.round(weekEarnings * COMMISSION_RATE * 100) / 100;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{t('dearn.title')}</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : (
          <>
            <View style={s.hero}>
              <Text style={s.heroLabel}>{t('dearn.today')}</Text>
              <Text style={s.heroValue}>{formatMAD(todayEarnings)}</Text>
            </View>

            <View style={s.row}>
              <View style={s.statCard}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={s.statValue}>{formatMAD(weekEarnings)}</Text>
                <Text style={s.statLabel}>{t('dearn.week')}</Text>
              </View>
              <View style={s.statCard}>
                <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                <Text style={s.statValue}>{formatMAD(total)}</Text>
                <Text style={s.statLabel}>{t('dearn.total')}</Text>
              </View>
            </View>

            <View style={s.statCardWide}>
              <Ionicons name="checkmark-done-outline" size={20} color={colors.success} />
              <Text style={s.statValue}>{completed.length}</Text>
              <Text style={s.statLabel}>{t('dearn.completedRides')}</Text>
            </View>

            {/* Commission owed to the platform this week */}
            <View style={s.commission}>
              <View style={s.commissionRow}>
                <View style={s.commissionLeft}>
                  <Ionicons name="business-outline" size={20} color={colors.primary} />
                  <View>
                    <Text style={s.commissionLabel}>{t('dearn.commission')}</Text>
                    <Text style={s.commissionSub}>{t('dearn.toPay')}</Text>
                  </View>
                </View>
                <Text style={s.commissionValue}>{formatMAD(weekCommission)}</Text>
              </View>
              <Text style={s.commissionNote}>{t('dearn.commissionNote', { rate: COMMISSION_RATE * 100 })}</Text>
            </View>

            <Text style={s.note}>{t('dearn.note')}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function useStyles() {
  return useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.margin, gap: Spacing.md },
    title: { ...Type.headlineXl, color: c.text },
    hero: { backgroundColor: c.primary, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.xs },
    heroLabel: { ...Type.labelMd, color: c.onPrimary, opacity: 0.85 },
    heroValue: { fontSize: 40, fontWeight: '800', color: c.onPrimary },
    row: { flexDirection: 'row', gap: Spacing.md },
    statCard: { flex: 1, backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: 4 },
    statCardWide: { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: 4 },
    statValue: { ...Type.headlineMd, color: c.text, fontWeight: '800' },
    statLabel: { ...Type.labelSm, color: c.textSecondary },
    commission: { backgroundColor: c.primaryContainer, borderWidth: 1, borderColor: c.primaryBorder, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
    commissionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    commissionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    commissionLabel: { ...Type.labelLg, color: c.text },
    commissionSub: { ...Type.labelSm, color: c.textSecondary },
    commissionValue: { ...Type.headlineMd, color: c.primary, fontWeight: '800' },
    commissionNote: { ...Type.labelSm, color: c.textSecondary },
    note: { ...Type.labelSm, color: c.textMuted, marginTop: Spacing.sm },
  }));
}
