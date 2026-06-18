import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { adminApi, type AdminStats } from '@/lib/adminApi';
import { disconnectSocket } from '@/lib/socket';
import { Button } from '@/components/Button';

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  const s = useThemedStyles((c) => ({
    card: {
      flex: 1,
      minWidth: '45%' as any,
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: color + '22',
      marginBottom: Spacing.xs,
    },
    value: { ...Type.headlineMd, color: c.text },
    label: { ...Type.labelSm, color: c.textSecondary },
  }));

  return (
    <View style={s.card}>
      <View style={s.iconWrap}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

export default function AdminStatsScreen() {
  const { token, user, signOut } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: Spacing.margin,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerLeft: { gap: 2 },
    headerTitle: { ...Type.headlineMd, color: c.text },
    headerSub: { ...Type.labelSm, color: c.textMuted },
    scroll: { flex: 1 },
    content: { padding: Spacing.margin, gap: Spacing.md },
    section: { ...Type.labelSm, color: c.textMuted, marginBottom: Spacing.xs },
    row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: Spacing.sm },
    errorText: { ...Type.bodyMd, color: c.error, textAlign: 'center' as const, padding: Spacing.lg },
    divider: { height: 1, backgroundColor: c.border, marginVertical: Spacing.xs },
  }));

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const data = await adminApi.stats(token);
      setStats(data);
    } catch {
      setError(t('admin.error.load'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const ridesTotal = stats
    ? Object.values(stats.rides.byStatus).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>{t('admin.stats.title')}</Text>
          <Text style={s.headerSub}>{user?.fullName || user?.email}</Text>
        </View>
        <Button
          label={t('settings.logout')}
          variant="ghost"
          size="md"
          onPress={async () => { disconnectSocket(); await signOut(); }}
        />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        {loading && !stats ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : error ? (
          <Text style={s.errorText}>{error}</Text>
        ) : stats ? (
          <>
            <Text style={s.section}>{t('admin.stats.passengers').toUpperCase()}</Text>
            <View style={s.row}>
              <StatCard
                label={t('admin.stats.passengers')}
                value={stats.users.passengers}
                icon="person"
                color={colors.primary}
              />
            </View>

            <View style={s.divider} />
            <Text style={s.section}>{t('admin.stats.drivers').toUpperCase()}</Text>
            <View style={s.row}>
              <StatCard label={t('admin.stats.drivers')} value={stats.users.drivers} icon="car-sport" color={colors.primary} />
              <StatCard label={t('admin.stats.online')} value={stats.users.onlineDrivers} icon="radio-button-on" color={colors.online} />
              <StatCard label={t('admin.stats.pending')} value={stats.users.pendingDrivers} icon="time" color={colors.warning} />
            </View>

            <View style={s.divider} />
            <Text style={s.section}>{t('admin.tab.rides').toUpperCase()}</Text>
            <View style={s.row}>
              <StatCard label={t('admin.stats.ridesTotal')} value={ridesTotal} icon="navigate" color={colors.primary} />
              <StatCard label={t('admin.stats.completed')} value={stats.rides.completed} icon="checkmark-circle" color={colors.success} />
              <StatCard
                label={t('admin.stats.cancelled')}
                value={(stats.rides.byStatus['cancelled'] || 0) + (stats.rides.byStatus['expired'] || 0)}
                icon="close-circle"
                color={colors.error}
              />
            </View>

            <View style={s.divider} />
            <Text style={s.section}>{t('admin.stats.revenue').toUpperCase()}</Text>
            <View style={s.row}>
              <StatCard
                label={t('admin.stats.revenue')}
                value={`${stats.rides.revenue.toFixed(2)} DH`}
                icon="cash"
                color={colors.success}
              />
              <StatCard
                label="Commission (10%)"
                value={`${(stats.rides.revenue * 0.1).toFixed(2)} DH`}
                icon="trending-up"
                color={colors.warning}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
