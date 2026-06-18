import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { adminApi, type AdminRide } from '@/lib/adminApi';

type Filter = 'all' | 'requested' | 'completed' | 'cancelled';

const STATUS_ICON: Record<string, string> = {
  completed: 'checkmark-circle',
  cancelled: 'close-circle',
  expired: 'timer',
  requested: 'time',
  accepted: 'car',
  arrived: 'location',
  started: 'navigate',
};

function RideCard({ ride }: { ride: AdminRide }) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const s = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    topRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.sm },
    statusIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    info: { flex: 1, gap: 2 },
    route: { ...Type.labelMd, color: c.text },
    people: { ...Type.labelSm, color: c.textSecondary },
    fare: { ...Type.labelLg, color: c.text },
    badge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    badgeText: { ...Type.labelSm },
    date: { ...Type.labelSm, color: c.textMuted },
  }));

  const status = ride.status;
  const statusColor =
    status === 'completed'
      ? colors.success
      : ['cancelled', 'expired'].includes(status)
      ? colors.error
      : status === 'requested'
      ? colors.warning
      : colors.primary;

  const icon = STATUS_ICON[status] || 'ellipse';
  const pickupAddr = ride.pickup?.address || '—';
  const destAddr = ride.destination?.address || '—';
  const passengerName = ride.passenger?.fullName || ride.passenger?.email || '—';
  const driverName = ride.driver?.fullName || ride.driver?.email || t('admin.rides.noDriver');
  const fare = ride.fare?.total;
  const dateStr = ride.createdAt
    ? new Date(ride.createdAt).toLocaleDateString()
    : '';

  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <View style={[s.statusIcon, { backgroundColor: statusColor + '22' }]}>
          <Ionicons name={icon as any} size={18} color={statusColor} />
        </View>
        <View style={s.info}>
          <Text style={s.route} numberOfLines={1}>
            {pickupAddr} → {destAddr}
          </Text>
          <Text style={s.people} numberOfLines={1}>
            {passengerName} · {driverName}
          </Text>
        </View>
        {fare != null && (
          <Text style={s.fare}>
            {t('admin.rides.fare').replace('{amount}', fare.toFixed(2))}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{status}</Text>
        </View>
        <Text style={s.date}>{dateStr}</Text>
      </View>
    </View>
  );
}

export default function AdminRidesScreen() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [rides, setRides] = useState<AdminRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      paddingHorizontal: Spacing.margin,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { ...Type.headlineMd, color: c.text, marginBottom: Spacing.sm },
    filters: { flexDirection: 'row' as const, gap: Spacing.sm, flexWrap: 'wrap' as const },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    chipText: { ...Type.labelSm },
    list: { padding: Spacing.margin },
    empty: { ...Type.bodyMd, color: c.textSecondary, textAlign: 'center' as const, padding: Spacing.xl },
    errorText: { ...Type.bodyMd, color: c.error, textAlign: 'center' as const, padding: Spacing.lg },
  }));

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      setLoading(true);
      const { rides: list } = await adminApi.listRides(token, filter === 'all' ? undefined : filter);
      setRides(list);
    } catch {
      setError(t('admin.error.load'));
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('admin.rides.all') },
    { key: 'requested', label: t('status.requested').replace('…', '') },
    { key: 'completed', label: t('rstatus.completed') },
    { key: 'cancelled', label: t('rstatus.cancelled') },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>{t('admin.rides.title')}</Text>
        <View style={s.filters}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[
                  s.chip,
                  {
                    backgroundColor: active ? colors.primary : 'transparent',
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[s.chipText, { color: active ? colors.onPrimary : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r, i) => r._id || String(i)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListEmptyComponent={<Text style={s.empty}>{t('admin.rides.empty')}</Text>}
          renderItem={({ item }) => <RideCard ride={item} />}
        />
      )}
    </SafeAreaView>
  );
}
