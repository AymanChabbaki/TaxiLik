import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { adminApi, type AdminUser } from '@/lib/adminApi';

// ---------- User Detail Modal ----------

function UserDetailModal({
  user: initial,
  token,
  visible,
  onClose,
  onUpdated,
}: {
  user: AdminUser;
  token: string;
  visible: boolean;
  onClose: () => void;
  onUpdated: (u: AdminUser) => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [user, setUser] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setUser(initial); }, [initial]);

  const s = useThemedStyles((c) => ({
    overlay: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' as const },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      maxHeight: '70%' as any,
    },
    // Fixed header — close button is NOT inside ScrollView
    sheetHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.margin,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    handle: {
      flex: 1, height: 4, borderRadius: 2, backgroundColor: c.border,
      alignSelf: 'center' as const, maxWidth: 40,
    },
    closeBtn: { padding: Spacing.sm },
    scroll: { padding: Spacing.margin },
    headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.md, marginBottom: Spacing.md },
    avatar: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.primaryContainer,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    avatarText: { ...Type.headlineMd, color: c.primary },
    nameBlock: { flex: 1 },
    name: { ...Type.headlineMd, color: c.text },
    email: { ...Type.labelSm, color: c.textSecondary },
    sectionLabel: { ...Type.labelSm, color: c.textMuted, marginTop: Spacing.md, marginBottom: Spacing.sm },
    card: {
      backgroundColor: c.surface, borderRadius: Radius.md,
      borderWidth: 1, borderColor: c.border, padding: Spacing.md,
    },
    infoRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: Spacing.xs },
    infoLabel: { ...Type.labelMd, color: c.textSecondary },
    infoValue: { ...Type.labelMd, color: c.text },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 2 },
    blockedBadge: {
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
      backgroundColor: c.errorContainer, paddingHorizontal: Spacing.sm,
      paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' as const,
    },
    blockedText: { ...Type.labelSm, color: c.error },
    blockBtn: {
      marginTop: Spacing.lg, marginBottom: Spacing.xl,
      paddingVertical: Spacing.md, borderRadius: Radius.lg,
      alignItems: 'center' as const,
    },
    blockBtnText: { ...Type.labelLg, color: '#fff' },
  }));

  const handleBlock = async () => {
    setBusy(true);
    try {
      const { user: updated } = await adminApi.setBlocked(token, user.id, !user.isBlocked);
      setUser(updated);
      onUpdated(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const initial0 = (user.fullName || user.email || '?')[0].toUpperCase();
  const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={s.sheet}>
          {/* Fixed header — close button is always tappable */}
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }} />
            <View style={s.handle} />
            <View style={{ flex: 1, alignItems: 'flex-end' as const }}>
              <Pressable style={s.closeBtn} onPress={onClose} hitSlop={16}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            <View style={s.headerRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initial0}</Text>
              </View>
              <View style={s.nameBlock}>
                <Text style={s.name}>{user.fullName || '—'}</Text>
                <Text style={s.email}>{user.email}</Text>
              </View>
              {user.isBlocked && (
                <View style={s.blockedBadge}>
                  <Ionicons name="ban" size={12} color={colors.error} />
                  <Text style={s.blockedText}>{t('admin.users.blocked')}</Text>
                </View>
              )}
            </View>

            <Text style={s.sectionLabel}>{t('admin.detail.info')}</Text>
            <View style={s.card}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('admin.detail.phone')}</Text>
                <Text style={s.infoValue}>{user.phone || '—'}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('admin.detail.email')}</Text>
                <Text style={s.infoValue}>{user.email}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('admin.detail.joined')}</Text>
                <Text style={s.infoValue}>{joinedDate}</Text>
              </View>
            </View>

            <Pressable
              style={[s.blockBtn, { backgroundColor: user.isBlocked ? colors.success : colors.error }]}
              onPress={handleBlock}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.blockBtnText}>
                  {user.isBlocked ? t('admin.users.unblock') : t('admin.users.block')}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------- User Row ----------

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const s = useThemedStyles((c) => ({
    row: {
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.sm,
      paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    avatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.primaryContainer,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    avatarText: { ...Type.labelLg, color: c.primary },
    info: { flex: 1, gap: 2 },
    name: { ...Type.labelMd, color: c.text },
    email: { ...Type.labelSm, color: c.textSecondary },
    blocked: {
      ...Type.labelSm, color: colors.error,
      backgroundColor: colors.errorContainer,
      paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full,
    },
    chevron: { padding: Spacing.xs },
  }));

  const initial = (user.fullName || user.email || '?')[0].toUpperCase();

  return (
    <Pressable style={s.row} onPress={onPress}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{user.fullName || '—'}</Text>
        <Text style={s.email} numberOfLines={1}>{user.email}</Text>
      </View>
      {user.isBlocked && <Text style={s.blocked}>{t('admin.users.blocked')}</Text>}
      <View style={s.chevron}>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

// ---------- Screen ----------

export default function AdminUsersScreen() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      paddingHorizontal: Spacing.margin, paddingTop: Spacing.md,
      paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    title: { ...Type.headlineMd, color: c.text },
    list: { paddingHorizontal: Spacing.margin },
    empty: { ...Type.bodyMd, color: c.textSecondary, textAlign: 'center' as const, padding: Spacing.xl },
    errorText: { ...Type.bodyMd, color: c.error, textAlign: 'center' as const, padding: Spacing.lg },
  }));

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      setLoading(true);
      const { users: list } = await adminApi.listUsers(token);
      setUsers(list);
    } catch {
      setError(t('admin.error.load'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const updateUser = useCallback((updated: AdminUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>{t('admin.users.title')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u, i) => u.id || String(i)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={s.empty}>{t('admin.users.empty')}</Text>}
          renderItem={({ item }) => (
            <UserRow user={item} onPress={() => setSelected(item)} />
          )}
        />
      )}

      {selected && token && (
        <UserDetailModal
          user={selected}
          token={token}
          visible={!!selected}
          onClose={() => setSelected(null)}
          onUpdated={updateUser}
        />
      )}
    </SafeAreaView>
  );
}
