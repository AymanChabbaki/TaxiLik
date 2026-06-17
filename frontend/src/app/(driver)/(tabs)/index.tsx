import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { LiveMap } from '@/components/LiveMap';
import { RideChat } from '@/components/RideChat';
import { ThemeModeToggle } from '@/components/ThemeModeToggle';
import { useAuth } from '@/lib/auth';
import { useCall } from '@/lib/call';
import { useI18n } from '@/lib/i18n';
import { acceptRide, advanceRide, declineRide, getAvailableRides, setStatus } from '@/lib/driver';
import { formatMAD } from '@/lib/rides';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { Radius, Spacing, Type, shadow } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import type { TranslationKey } from '@/lib/translations';
import type { Coords, Ride } from '@/lib/types';

function distanceKm(a: Coords, b: Coords) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const LIFECYCLE: Record<string, { labelKey: TranslationKey; action: 'arrive' | 'start' | 'complete' }> = {
  accepted: { labelKey: 'driver.arrived', action: 'arrive' },
  arrived: { labelKey: 'driver.start', action: 'start' },
  started: { labelKey: 'driver.complete', action: 'complete' },
};

export default function DriverDashboard() {
  const { user, token, signOut } = useAuth();
  const { colors, scheme } = useTheme();
  const { t } = useI18n();
  const s = useStyles();

  const [online, setOnline] = useState(user?.driver?.isOnline ?? false);
  const [toggling, setToggling] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [offer, setOffer] = useState<any | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const coordsRef = useRef<Coords | null>(null);
  const activeRef = useRef<Ride | null>(null);
  activeRef.current = activeRide;

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    const onNew = (p: any) => {
      if (!activeRef.current) {
        setOffer(p);
        // Tell the passenger a driver is viewing their request.
        if (p?.rideId) socket.emit('ride:viewing', p.rideId);
      }
    };
    const onCancelled = () => {
      setActiveRide(null);
      setOffer(null);
    };
    socket.on('ride:new', onNew);
    socket.on('ride:cancelled', onCancelled);
    return () => {
      socket.off('ride:new', onNew);
      socket.off('ride:cancelled', onCancelled);
    };
  }, [token]);

  const startWatching = useCallback(async () => {
    if (watchRef.current) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 25 },
      (pos) => {
        const c = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        setCoords(c);
        coordsRef.current = c;
        connectSocket(token!).emit('driver:location', { ...c, rideId: activeRef.current?._id });
      }
    );
  }, [token]);

  const stopWatching = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  useEffect(() => () => stopWatching(), [stopWatching]);

  async function toggleOnline(next: boolean) {
    if (!token) return;
    setToggling(true);
    try {
      let c = coordsRef.current;
      if (next && !c) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          c = { lng: pos.coords.longitude, lat: pos.coords.latitude };
          setCoords(c);
          coordsRef.current = c;
        }
      }
      await setStatus(token, next, c ?? undefined);
      setOnline(next);
      if (next) {
        await startWatching();
        const { rides } = await getAvailableRides(token);
        if (rides.length && !activeRef.current) {
          const r = rides[0];
          setOffer({ rideId: r._id, pickup: r.pickup, destination: r.destination, fare: r.fare, passengers: r.passengers });
          connectSocket(token).emit('ride:viewing', r._id);
        }
      } else {
        stopWatching();
        setOffer(null);
      }
    } catch {
      /* ignore */
    } finally {
      setToggling(false);
    }
  }

  async function onAccept() {
    if (!token || !offer) return;
    setBusy(true);
    try {
      connectSocket(token).emit('ride:unview', offer.rideId);
      const { ride } = await acceptRide(token, offer.rideId);
      setActiveRide(ride);
      setOffer(null);
      connectSocket(token).emit('ride:join', ride._id);
    } catch {
      setOffer(null);
    } finally {
      setBusy(false);
    }
  }

  async function onIgnore() {
    if (!token || !offer) return;
    const id = offer.rideId;
    setOffer(null);
    try {
      connectSocket(token).emit('ride:unview', id);
      await declineRide(token, id);
    } catch {
      /* ignore */
    }
  }

  async function onAdvance() {
    if (!token || !activeRide) return;
    const step = LIFECYCLE[activeRide.status];
    if (!step) return;
    setBusy(true);
    try {
      const { ride } = await advanceRide(token, activeRide._id, step.action);
      setActiveRide(ride.status === 'completed' ? null : ride);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function navigateTo() {
    if (!activeRide) return;
    const target = activeRide.status === 'started' ? activeRide.destination : activeRide.pickup;
    const [lng, lat] = target.location.coordinates;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  }

  async function doSignOut() {
    if (token && online) {
      try {
        await setStatus(token, false);
      } catch {
        /* ignore */
      }
    }
    stopWatching();
    disconnectSocket();
    await signOut();
  }

  const offerDistance =
    offer && coords
      ? distanceKm(coords, { lng: offer.pickup.location.coordinates[0], lat: offer.pickup.location.coordinates[1] })
      : null;

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <Pressable style={s.driverInfo} onPress={() => setSettingsOpen(true)}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatar} contentFit="cover" />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View>
              <Text style={s.driverName} numberOfLines={1}>{user?.fullName || t('auth.driver')}</Text>
              <Text style={s.driverId}>{user?.driver?.vehicle?.plate || t('driver.taxi')}</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => toggleOnline(!online)}
            disabled={toggling}
            style={[s.statusPill, { backgroundColor: online ? colors.primaryContainer : colors.surfaceAlt }]}
          >
            {toggling ? (
              <ActivityIndicator size="small" color={online ? colors.online : colors.offline} />
            ) : (
              <View style={[s.dot, { backgroundColor: online ? colors.online : colors.offline }]} />
            )}
            <Text style={[s.pillText, { color: online ? colors.online : colors.textSecondary }]}>
              {online ? t('driver.online') : t('driver.offline')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <LiveMap
        dark={scheme === 'dark'}
        viewerRole="driver"
        label={online ? t('driver.visible') : t('driver.offlineMap')}
        user={coords}
        center={coords}
        pickup={activeRide ? { lat: activeRide.pickup.location.coordinates[1], lng: activeRide.pickup.location.coordinates[0] } : (offer ? { lat: offer.pickup.location.coordinates[1], lng: offer.pickup.location.coordinates[0] } : null)}
        destination={activeRide ? { lat: activeRide.destination.location.coordinates[1], lng: activeRide.destination.location.coordinates[0] } : null}
      />

      <View style={s.sheet}>
        <View style={s.grabber} />
        {activeRide ? (
          <ActiveRide ride={activeRide} busy={busy} onAdvance={onAdvance} onNavigate={navigateTo} onMessage={() => setChatOpen(true)} />
        ) : offer ? (
          <OfferCard offer={offer} distanceKm={offerDistance} busy={busy} onAccept={onAccept} onIgnore={onIgnore} />
        ) : (
          <View style={s.idle}>
            <View style={s.idleIcon}>
              <Ionicons name={online ? 'search' : 'power'} size={26} color={online ? colors.primary : colors.textMuted} />
            </View>
            <Text style={s.idleTitle}>{online ? t('driver.waiting') : t('driver.youAreOffline')}</Text>
            <Text style={s.idleSub}>{online ? t('driver.waitingSub') : t('driver.goOnlineSub')}</Text>
          </View>
        )}
      </View>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} onSignOut={doSignOut} />
      {activeRide ? (
        <RideChat rideId={activeRide._id} open={chatOpen} onClose={() => setChatOpen(false)} title={t('chat.withPassenger')} />
      ) : null}
    </View>
  );
}

function OfferCard({ offer, distanceKm, busy, onAccept, onIgnore }: { offer: any; distanceKm: number | null; busy: boolean; onAccept: () => void; onIgnore: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const { t } = useI18n();
  const eta = distanceKm != null ? Math.max(1, Math.round((distanceKm / 25) * 60)) : null;
  return (
    <View style={s.offer}>
      <View style={s.offerTop}>
        <View style={s.badge}><Text style={s.badgeText}>{t('driver.newRide')}</Text></View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.offerPrice}>{formatMAD(offer.fare.total)}</Text>
          <Text style={s.offerPriceLabel}>{t('driver.legalFare')}</Text>
        </View>
      </View>
      <View style={s.offerLoc}>
        <View style={[s.pin, { backgroundColor: colors.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.locLabel}>{t('driver.pickup')}</Text>
          <Text style={s.locValue} numberOfLines={1}>{offer.pickup.address}</Text>
        </View>
      </View>
      <View style={s.offerLoc}>
        <Ionicons name="location" size={16} color={colors.text} />
        <View style={{ flex: 1 }}>
          <Text style={s.locLabel}>{t('driver.dest')}</Text>
          <Text style={s.locValue} numberOfLines={1}>{offer.destination.address}</Text>
        </View>
      </View>
      <View style={s.metaRow}>
        <View style={s.metaItem}><Ionicons name="people-outline" size={16} color={colors.textSecondary} /><Text style={s.metaText}>{offer.passengers ?? 1}</Text></View>
        {distanceKm != null ? (
          <>
            <View style={s.metaItem}><Ionicons name="navigate-outline" size={16} color={colors.textSecondary} /><Text style={s.metaText}>{t('driver.away', { km: distanceKm.toFixed(1) })}</Text></View>
            <View style={s.metaItem}><Ionicons name="time-outline" size={16} color={colors.textSecondary} /><Text style={s.metaText}>{t('driver.eta', { min: eta ?? 0 })}</Text></View>
          </>
        ) : null}
      </View>
      <View style={s.offerActions}>
        <Button label={t('driver.ignore')} variant="secondary" onPress={onIgnore} style={{ flex: 1 }} />
        <Button label={t('driver.accept')} onPress={onAccept} loading={busy} style={{ flex: 1 }} />
      </View>
      <Text style={s.offerLegal}>{t('driver.fixedPrice')}</Text>
    </View>
  );
}

function ActiveRide({ ride, busy, onAdvance, onNavigate, onMessage }: { ride: Ride; busy: boolean; onAdvance: () => void; onNavigate: () => void; onMessage: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { startCall, supported } = useCall();
  const step = LIFECYCLE[ride.status];
  const heading = ride.status === 'accepted' ? t('driver.toPassenger') : ride.status === 'arrived' ? t('driver.waitingPassenger') : t('driver.tripOngoing');
  const target = ride.status === 'started' ? ride.destination : ride.pickup;
  const passenger = typeof ride.passenger === 'object' ? (ride.passenger as any) : null;
  const paxName = passenger?.fullName || t('auth.passenger');
  return (
    <View style={{ gap: Spacing.md }}>
      <Text style={s.activeHeading}>{heading}</Text>

      {/* Passenger */}
      <View style={s.paxCard}>
        <View style={s.paxAvatar}><Ionicons name="person" size={20} color={colors.onPrimary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.driverName}>{passenger?.fullName || t('auth.passenger')}</Text>
          <Text style={s.driverId}>{(ride.passengers ?? 1)} {t('booking.passengers')}</Text>
        </View>
        <Text style={s.offerPrice}>{formatMAD(ride.fare.total)}</Text>
      </View>

      <View style={s.offerLoc}>
        <Ionicons name="location" size={16} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.locLabel}>{ride.status === 'started' ? t('driver.dest') : t('driver.pickup')}</Text>
          <Text style={s.locValue} numberOfLines={1}>{target.address}</Text>
        </View>
      </View>

      <View style={s.offerActions}>
        <Button label={t('common.call')} variant="outline" onPress={() => (supported ? startCall(ride._id, paxName) : Alert.alert('TaxiLik.ma', t('call.unsupported')))} icon={<Ionicons name="call" size={18} color={colors.primary} />} style={{ flex: 1 }} />
        <Button label={t('common.message')} variant="outline" onPress={onMessage} icon={<Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />} style={{ flex: 1 }} />
      </View>
      <Button label={t('driver.navigate')} variant="secondary" onPress={onNavigate} icon={<Ionicons name="navigate" size={18} color={colors.text} />} />
      {step ? <Button label={t(step.labelKey)} onPress={onAdvance} loading={busy} /> : null}
    </View>
  );
}

function SettingsSheet({ open, onClose, onSignOut }: { open: boolean; onClose: () => void; onSignOut: () => void }) {
  const s = useStyles();
  const { t } = useI18n();
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable style={s.modalSheet}>
          <View style={s.grabber} />
          <Text style={s.modalTitle}>{t('driver.settings')}</Text>
          <Text style={s.modalLabel}>{t('settings.appearance')}</Text>
          <ThemeModeToggle />
          <Text style={s.modalLabel}>{t('settings.language')}</Text>
          <LanguageToggle />
          <Button label={t('settings.logout')} variant="outline" onPress={onSignOut} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function useStyles() {
  return useThemedStyles((c, scheme) => ({
    root: { flex: 1, backgroundColor: c.background },
    headerSafe: { backgroundColor: c.surface },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.margin, paddingVertical: Spacing.sm, gap: Spacing.sm },
    driverInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    avatar: { width: 42, height: 42, borderRadius: Radius.full, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: c.onPrimary, ...Type.labelLg },
    driverName: { ...Type.labelLg, color: c.text },
    driverId: { ...Type.labelSm, color: c.textSecondary },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    dot: { width: 8, height: 8, borderRadius: 4 },
    pillText: { ...Type.labelMd, fontWeight: '700' },
    sheet: { backgroundColor: c.surface, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.margin, paddingBottom: Spacing.xl, ...shadow(scheme, 'sheet') },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: Spacing.md },
    idle: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
    idleIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    idleTitle: { ...Type.headlineMd, color: c.text },
    idleSub: { ...Type.bodyMd, color: c.textSecondary, textAlign: 'center' },
    offer: { gap: Spacing.md, borderWidth: 2, borderColor: c.primary, borderRadius: Radius.xl, padding: Spacing.md },
    offerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    badge: { backgroundColor: c.primary, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
    badgeText: { ...Type.labelSm, color: c.onPrimary, fontWeight: '800' },
    offerPrice: { ...Type.headlineMd, color: c.primary, fontWeight: '800' },
    offerPriceLabel: { ...Type.labelSm, color: c.textSecondary },
    offerLoc: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    pin: { width: 14, height: 14, borderRadius: 7, marginHorizontal: 1 },
    locLabel: { ...Type.labelSm, color: c.textMuted, fontWeight: '800', fontSize: 11 },
    locValue: { ...Type.bodyMd, color: c.text, fontWeight: '600' },
    metaRow: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: c.surfaceAlt, borderRadius: Radius.md, padding: Spacing.sm },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1, justifyContent: 'center' },
    metaText: { ...Type.labelMd, color: c.textSecondary },
    offerActions: { flexDirection: 'row', gap: Spacing.sm },
    offerLegal: { ...Type.labelSm, color: c.textMuted, textAlign: 'center' },
    activeHeading: { ...Type.headlineMd, color: c.text },
    paxCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: c.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.md },
    paxAvatar: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    modalBackdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.margin, paddingBottom: Spacing.xl, gap: Spacing.md },
    modalTitle: { ...Type.headlineMd, color: c.text },
    modalLabel: { ...Type.labelSm, color: c.textMuted },
  }));
}
