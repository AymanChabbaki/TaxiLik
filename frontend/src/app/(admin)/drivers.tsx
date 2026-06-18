import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { adminApi, type AdminDocument, type AdminDriver } from '@/lib/adminApi';
import { API_BASE_URL } from '@/lib/api';

// URLs stored in the DB are already absolute (built by the upload controller).
// Only prepend API_BASE_URL for legacy relative paths starting with "/".
function mediaUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url}`;
}

function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

const DOC_TYPES = ['cin', 'permis', 'carte_grise', 'assurance', 'permis_confiance'] as const;

// ---------- Driver Detail Modal ----------

function DriverDetailModal({
  driver: initial,
  token,
  visible,
  onClose,
  onUpdated,
}: {
  driver: AdminDriver;
  token: string;
  visible: boolean;
  onClose: () => void;
  onUpdated: (d: AdminDriver) => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [driver, setDriver] = useState(initial);
  const [rejectInputs, setRejectInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { setDriver(initial); }, [initial]);

  const s = useThemedStyles((c) => ({
    overlay: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' as const },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      maxHeight: '92%' as any,
    },
    // Fixed header — handle + close button are NOT inside ScrollView
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
      alignSelf: 'center' as const, maxWidth: 40, marginHorizontal: 'auto' as any,
    },
    closeBtn: { padding: Spacing.sm },
    scroll: { padding: Spacing.margin },
    headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.md, marginBottom: Spacing.md },
    avatar: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.primaryContainer,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    avatarImg: { width: 56, height: 56, borderRadius: 28 },
    avatarText: { ...Type.headlineMd, color: c.primary },
    nameBlock: { flex: 1 },
    name: { ...Type.headlineMd, color: c.text },
    email: { ...Type.labelSm, color: c.textSecondary },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
    statusText: { ...Type.labelSm },
    sectionLabel: { ...Type.labelSm, color: c.textMuted, marginTop: Spacing.md, marginBottom: Spacing.sm },
    infoCard: {
      backgroundColor: c.surface, borderRadius: Radius.md,
      borderWidth: 1, borderColor: c.border, padding: Spacing.md,
    },
    infoRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: Spacing.xs },
    infoLabel: { ...Type.labelMd, color: c.textSecondary },
    infoValue: { ...Type.labelMd, color: c.text },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 2 },
    docRow: {
      backgroundColor: c.surface, borderRadius: Radius.md,
      borderWidth: 1, borderColor: c.border,
      padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
    },
    docHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    docTitle: { ...Type.labelMd, color: c.text, flex: 1 },
    docBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
    docBadgeText: { ...Type.labelSm },
    docImg: { width: '100%' as any, height: 160, borderRadius: Radius.md, backgroundColor: c.surfaceAlt, marginTop: Spacing.xs },
    docActions: { flexDirection: 'row' as const, gap: Spacing.sm, marginTop: Spacing.xs },
    docBtn: { flex: 1, paddingVertical: Spacing.xs, borderRadius: Radius.md, alignItems: 'center' as const },
    docBtnText: { ...Type.labelSm },
    rejectInput: {
      borderWidth: 1, borderColor: c.border, borderRadius: Radius.md,
      padding: Spacing.sm, ...Type.bodyMd, color: c.text, marginTop: Spacing.xs,
    },
    globalActions: { flexDirection: 'row' as const, gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.xl },
    globalBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' as const },
    globalBtnText: { ...Type.labelLg },
  }));

  const approvalStatus = driver.driver.approvalStatus;
  const statusColor =
    approvalStatus === 'approved' ? colors.success :
    approvalStatus === 'rejected' ? colors.error : colors.warning;

  const getDocStatus = (type: string): AdminDocument | undefined =>
    driver.driver.documents.find((d) => d.type === type);

  const docStatusColor = (status: string) =>
    status === 'approved' ? colors.success :
    status === 'rejected' ? colors.error : colors.warning;

  const docStatusLabel = (status: string) =>
    status === 'approved' ? t('admin.detail.docApproved') :
    status === 'rejected' ? t('admin.detail.docRejected') : t('admin.detail.docPending');

  const handleReviewDoc = async (type: string, status: 'approved' | 'rejected') => {
    setBusy(type + status);
    try {
      const reason = rejectInputs[type];
      const { driver: updated } = await adminApi.reviewDocument(token, driver.id, type, status, reason);
      setDriver(updated);
      onUpdated(updated);
      if (status === 'approved') setRejectInputs((p) => { const n = { ...p }; delete n[type]; return n; });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleGlobalApproval = async (status: 'approved' | 'rejected') => {
    setBusy('global' + status);
    try {
      const { driver: updated } = await adminApi.setApproval(token, driver.id, status);
      setDriver(updated);
      onUpdated(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleBlock = async () => {
    setBusy('block');
    try {
      const { user } = await adminApi.setBlocked(token, driver.id, !driver.isBlocked);
      const updated = { ...driver, isBlocked: user.isBlocked };
      setDriver(updated);
      onUpdated(updated as AdminDriver);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(null);
    }
  };

  const initial0 = (driver.fullName || driver.email || '?')[0].toUpperCase();
  const joinedDate = driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : '—';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={s.sheet}>
          {/* Fixed header outside ScrollView — close button is always tappable */}
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
            {/* Driver header */}
            <View style={s.headerRow}>
              {driver.avatarUrl ? (
                <Image source={{ uri: mediaUrl(driver.avatarUrl) }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}><Text style={s.avatarText}>{initial0}</Text></View>
              )}
              <View style={s.nameBlock}>
                <Text style={s.name}>{driver.fullName || '—'}</Text>
                <Text style={s.email}>{driver.email}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[s.statusText, { color: statusColor }]}>{approvalStatus}</Text>
              </View>
            </View>

            {/* Informations */}
            <Text style={s.sectionLabel}>{t('admin.detail.info')}</Text>
            <View style={s.infoCard}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('admin.detail.phone')}</Text>
                <Text style={s.infoValue}>{driver.phone || '—'}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('admin.detail.joined')}</Text>
                <Text style={s.infoValue}>{joinedDate}</Text>
              </View>
              {driver.isBlocked && (
                <>
                  <View style={s.divider} />
                  <View style={s.infoRow}>
                    <Text style={[s.infoLabel, { color: colors.error }]}>{t('admin.users.blocked')}</Text>
                    <Ionicons name="ban" size={16} color={colors.error} />
                  </View>
                </>
              )}
            </View>

            {/* Vehicle */}
            {(driver.driver.vehicle?.plate || driver.driver.vehicle?.licenseNumber) && (
              <>
                <Text style={s.sectionLabel}>{t('admin.detail.vehicle')}</Text>
                <View style={s.infoCard}>
                  {driver.driver.vehicle?.plate && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>{t('admin.detail.plate')}</Text>
                      <Text style={s.infoValue}>{driver.driver.vehicle.plate}</Text>
                    </View>
                  )}
                  {driver.driver.vehicle?.plate && driver.driver.vehicle?.licenseNumber && <View style={s.divider} />}
                  {driver.driver.vehicle?.licenseNumber && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>{t('admin.detail.license')}</Text>
                      <Text style={s.infoValue}>{driver.driver.vehicle.licenseNumber}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Documents */}
            <Text style={s.sectionLabel}>{t('admin.detail.documents')}</Text>
            {DOC_TYPES.map((type) => {
              const doc = getDocStatus(type);
              const docColor = doc ? docStatusColor(doc.status) : colors.textMuted;
              const docLabel = doc ? docStatusLabel(doc.status) : t('admin.detail.noDoc');

              return (
                <View key={type} style={s.docRow}>
                  <View style={s.docHeader}>
                    <Text style={s.docTitle}>{t(`admin.doc.${type}` as any)}</Text>
                    <View style={[s.docBadge, { backgroundColor: docColor + '22' }]}>
                      <Text style={[s.docBadgeText, { color: docColor }]}>{docLabel}</Text>
                    </View>
                  </View>

                  {doc?.rejectionReason ? (
                    <Text style={{ ...Type.labelSm, color: colors.error }}>{doc.rejectionReason}</Text>
                  ) : null}

                  {doc?.url ? (
                    isPdf(doc.url) ? (
                      <Pressable
                        style={[s.docImg, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm }]}
                        onPress={() => Linking.openURL(mediaUrl(doc.url))}
                      >
                        <Ionicons name="document-text-outline" size={28} color={colors.primary} />
                        <Text style={{ ...Type.labelLg, color: colors.primary }}>Ouvrir le PDF</Text>
                      </Pressable>
                    ) : (
                      <Image
                        source={{ uri: mediaUrl(doc.url) }}
                        style={s.docImg}
                        resizeMode="contain"
                      />
                    )
                  ) : null}

                  {doc && (
                    <>
                      <View style={s.docActions}>
                        {doc.status !== 'approved' && (
                          <Pressable
                            style={[s.docBtn, { backgroundColor: colors.success + '22' }]}
                            onPress={() => handleReviewDoc(type, 'approved')}
                            disabled={busy === type + 'approved'}
                          >
                            {busy === type + 'approved' ? (
                              <ActivityIndicator size="small" color={colors.success} />
                            ) : (
                              <Text style={[s.docBtnText, { color: colors.success }]}>{t('admin.detail.approveDoc')}</Text>
                            )}
                          </Pressable>
                        )}
                        {doc.status !== 'rejected' && (
                          <Pressable
                            style={[s.docBtn, { backgroundColor: colors.error + '22' }]}
                            onPress={() => handleReviewDoc(type, 'rejected')}
                            disabled={busy === type + 'rejected'}
                          >
                            {busy === type + 'rejected' ? (
                              <ActivityIndicator size="small" color={colors.error} />
                            ) : (
                              <Text style={[s.docBtnText, { color: colors.error }]}>{t('admin.detail.rejectDoc')}</Text>
                            )}
                          </Pressable>
                        )}
                      </View>

                      {doc.status !== 'rejected' && (
                        <TextInput
                          style={s.rejectInput}
                          placeholder={t('admin.detail.rejectPlaceholder')}
                          placeholderTextColor={colors.textMuted}
                          value={rejectInputs[type] || ''}
                          onChangeText={(v) => setRejectInputs((p) => ({ ...p, [type]: v }))}
                        />
                      )}
                    </>
                  )}
                </View>
              );
            })}

            {/* Global decision + block */}
            <Text style={s.sectionLabel}>{t('admin.detail.approval')}</Text>
            <View style={s.globalActions}>
              {approvalStatus !== 'approved' && (
                <Pressable
                  style={[s.globalBtn, { backgroundColor: colors.success }]}
                  onPress={() => handleGlobalApproval('approved')}
                  disabled={!!busy}
                >
                  {busy === 'globalapproved' ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={[s.globalBtnText, { color: colors.onPrimary }]}>{t('admin.drivers.approve')}</Text>
                  )}
                </Pressable>
              )}
              {approvalStatus !== 'rejected' && (
                <Pressable
                  style={[s.globalBtn, { backgroundColor: colors.error }]}
                  onPress={() => handleGlobalApproval('rejected')}
                  disabled={!!busy}
                >
                  {busy === 'globalrejected' ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={[s.globalBtnText, { color: colors.onPrimary }]}>{t('admin.drivers.reject')}</Text>
                  )}
                </Pressable>
              )}
              <Pressable
                style={[s.globalBtn, { backgroundColor: driver.isBlocked ? colors.success : colors.warning }]}
                onPress={handleBlock}
                disabled={!!busy}
              >
                {busy === 'block' ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[s.globalBtnText, { color: colors.onPrimary }]}>
                    {driver.isBlocked ? t('admin.drivers.unblock') : t('admin.drivers.block')}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Driver Card ----------

function DriverCard({
  driver,
  onPress,
  onApprove,
  onReject,
  onBlock,
}: {
  driver: AdminDriver;
  onPress: () => void;
  onApprove: () => void;
  onReject: () => void;
  onBlock: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const s = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.surface, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: Spacing.sm,
    },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.sm },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.primaryContainer,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    avatarText: { ...Type.labelLg, color: c.primary },
    info: { flex: 1, gap: 2 },
    name: { ...Type.labelLg, color: c.text },
    email: { ...Type.labelSm, color: c.textSecondary },
    badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
    badgeText: { ...Type.labelSm },
    meta: { flexDirection: 'row' as const, gap: Spacing.sm, flexWrap: 'wrap' as const },
    metaChip: {
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
      backgroundColor: c.surfaceAlt, paddingHorizontal: Spacing.sm,
      paddingVertical: 3, borderRadius: Radius.full,
    },
    metaText: { ...Type.labelSm, color: c.textSecondary },
    actions: { flexDirection: 'row' as const, gap: Spacing.sm },
    btn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' as const },
    btnText: { ...Type.labelMd },
    detailHint: { ...Type.labelSm, color: c.primary, textAlign: 'right' as const },
  }));

  const approvalStatus = driver.driver.approvalStatus;
  const statusColor =
    approvalStatus === 'approved' ? colors.success :
    approvalStatus === 'rejected' ? colors.error : colors.warning;

  const docsApproved = driver.driver.documents.filter((d) => d.status === 'approved').length;
  const initial = (driver.fullName || driver.email || '?')[0].toUpperCase();

  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>{driver.fullName || driver.email}</Text>
          <Text style={s.email} numberOfLines={1}>{driver.email}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{approvalStatus}</Text>
        </View>
      </View>

      <View style={s.meta}>
        <View style={s.metaChip}>
          <Ionicons
            name={driver.driver.isOnline ? 'radio-button-on' : 'radio-button-off'}
            size={10}
            color={driver.driver.isOnline ? colors.online : colors.offline}
          />
          <Text style={s.metaText}>
            {driver.driver.isOnline ? t('admin.drivers.online') : t('admin.drivers.offline')}
          </Text>
        </View>
        <View style={s.metaChip}>
          <Ionicons name="document-text" size={10} color={colors.textSecondary} />
          <Text style={s.metaText}>{t('admin.drivers.docs').replace('{n}', String(docsApproved))}</Text>
        </View>
        {driver.driver.vehicle?.plate && (
          <View style={s.metaChip}>
            <Ionicons name="car" size={10} color={colors.textSecondary} />
            <Text style={s.metaText}>{driver.driver.vehicle.plate}</Text>
          </View>
        )}
        {driver.isBlocked && (
          <View style={[s.metaChip, { backgroundColor: colors.errorContainer }]}>
            <Ionicons name="ban" size={10} color={colors.error} />
            <Text style={[s.metaText, { color: colors.error }]}>{t('admin.users.blocked')}</Text>
          </View>
        )}
      </View>

      <Text style={s.detailHint}>Voir les détails →</Text>

      <View style={s.actions}>
        {approvalStatus === 'pending' && (
          <>
            <Pressable style={[s.btn, { backgroundColor: colors.success + '22' }]} onPress={(e) => { e.stopPropagation?.(); onApprove(); }}>
              <Text style={[s.btnText, { color: colors.success }]}>{t('admin.drivers.approve')}</Text>
            </Pressable>
            <Pressable style={[s.btn, { backgroundColor: colors.error + '22' }]} onPress={(e) => { e.stopPropagation?.(); onReject(); }}>
              <Text style={[s.btnText, { color: colors.error }]}>{t('admin.drivers.reject')}</Text>
            </Pressable>
          </>
        )}
        {approvalStatus === 'approved' && (
          <Pressable style={[s.btn, { backgroundColor: colors.error + '22' }]} onPress={(e) => { e.stopPropagation?.(); onReject(); }}>
            <Text style={[s.btnText, { color: colors.error }]}>{t('admin.drivers.reject')}</Text>
          </Pressable>
        )}
        {approvalStatus === 'rejected' && (
          <Pressable style={[s.btn, { backgroundColor: colors.success + '22' }]} onPress={(e) => { e.stopPropagation?.(); onApprove(); }}>
            <Text style={[s.btnText, { color: colors.success }]}>{t('admin.drivers.approve')}</Text>
          </Pressable>
        )}
        <Pressable
          style={[s.btn, { backgroundColor: driver.isBlocked ? colors.success + '22' : colors.warning + '22' }]}
          onPress={(e) => { e.stopPropagation?.(); onBlock(); }}
        >
          <Text style={[s.btnText, { color: driver.isBlocked ? colors.success : colors.warning }]}>
            {driver.isBlocked ? t('admin.drivers.unblock') : t('admin.drivers.block')}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ---------- Screen ----------

export default function AdminDriversScreen() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminDriver | null>(null);

  const s = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      paddingHorizontal: Spacing.margin, paddingTop: Spacing.md,
      paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    title: { ...Type.headlineMd, color: c.text, marginBottom: Spacing.sm },
    filters: { flexDirection: 'row' as const, gap: Spacing.sm },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1 },
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
      const { drivers: list } = await adminApi.listDrivers(token, filter === 'all' ? undefined : filter);
      setDrivers(list);
    } catch {
      setError(t('admin.error.load'));
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  const updateDriver = useCallback((updated: AdminDriver) => {
    setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    if (!token) return;
    try {
      const { driver } = await adminApi.setApproval(token, id, 'approved');
      updateDriver(driver);
    } catch (e: any) {
      Alert.alert('Error', e.message || t('admin.error.load'));
    }
  }, [token, updateDriver]);

  const handleReject = useCallback((id: string) => {
    if (!token) return;
    Alert.alert(t('admin.drivers.reject'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.drivers.reject'), style: 'destructive',
        onPress: async () => {
          try {
            const { driver } = await adminApi.setApproval(token, id, 'rejected');
            updateDriver(driver);
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }, [token, updateDriver]);

  const handleBlock = useCallback(async (driver: AdminDriver) => {
    if (!token) return;
    try {
      const { user } = await adminApi.setBlocked(token, driver.id, !driver.isBlocked);
      updateDriver({ ...driver, isBlocked: user.isBlocked });
    } catch (e: any) { Alert.alert('Error', e.message); }
  }, [token, updateDriver]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('admin.drivers.all') },
    { key: 'pending', label: t('admin.drivers.pending') },
    { key: 'approved', label: t('admin.drivers.approved') },
    { key: 'rejected', label: t('admin.drivers.rejected') },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>{t('admin.drivers.title')}</Text>
        <View style={s.filters}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[s.chip, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.border }]}
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
          data={drivers}
          keyExtractor={(d, i) => d.id || String(i)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListEmptyComponent={<Text style={s.empty}>{t('admin.drivers.empty')}</Text>}
          renderItem={({ item }) => (
            <DriverCard
              driver={item}
              onPress={() => setSelected(item)}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onBlock={() => handleBlock(item)}
            />
          )}
        />
      )}

      {selected && token && (
        <DriverDetailModal
          driver={selected}
          token={token}
          visible={!!selected}
          onClose={() => setSelected(null)}
          onUpdated={updateDriver}
        />
      )}
    </SafeAreaView>
  );
}
