import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { LiveMap } from '@/components/LiveMap';
import { Wordmark } from '@/components/Logo';
import { RatingModal } from '@/components/RatingModal';
import { RideChat } from '@/components/RideChat';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCall } from '@/lib/call';
import { useI18n } from '@/lib/i18n';
import { CASABLANCA_PLACES, DEFAULT_PICKUP, type Place } from '@/lib/places';
import { cancelRide, createRide, estimateFare, formatMAD, getActiveRide, getNearbyDrivers } from '@/lib/rides';
import { connectSocket } from '@/lib/socket';
import { Radius, Spacing, Type, shadow } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import type { Coords, Fare, Ride } from '@/lib/types';

const statusLabel = (t: (k: any) => string, status: string) =>
  t(`status.${status}` as any);

export default function BookingScreen() {
  const { token, user } = useAuth();
  const { colors, scheme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const s = useStyles();

  const [pickup, setPickup] = useState<Place>(DEFAULT_PICKUP);
  const [destination, setDestination] = useState<Place | null>(null);
  const [fare, setFare] = useState<Fare | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<any>(null);
  const [nearby, setNearby] = useState<{ id: string; lat: number; lng: number }[]>([]);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [viewers, setViewers] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [picking, setPicking] = useState<'pickup' | 'destination' | null>(null);
  const [completedRide, setCompletedRide] = useState<Ride | null>(null);

  // Fetch GPS and set it as the pickup ("Position actuelle").
  const locateMe = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      const coords: Coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
      let address = t('booking.currentPosition');
      if (Platform.OS !== 'web') {
        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
          if (geo) address = [geo.street || geo.name, geo.city].filter(Boolean).join(', ') || address;
        } catch {
          /* best effort */
        }
      }
      setPickup({ name: t('booking.currentPosition'), address, coords });
    } catch {
      /* keep default */
    }
  }, [t]);

  useEffect(() => {
    locateMe();
  }, [locateMe]);

  useEffect(() => {
    if (!token) return;
    getActiveRide(token).then(({ ride }) => setActiveRide(ride)).catch(() => {});
    const socket = connectSocket(token);
    const driverLoc = (drv: any) => {
      const c = drv?.location?.coordinates;
      if (c) setDriverPos({ lng: c[0], lat: c[1] });
    };
    const onAccepted = (p: any) => {
      setAssignedDriver(p.driver);
      driverLoc(p.driver);
      setActiveRide((r) => (r ? { ...r, status: 'accepted' } : r));
    };
    const onUpdated = (p: any) => p.ride && setActiveRide(p.ride);
    const onStatus = (p: any) => setActiveRide((r) => (r ? { ...r, status: p.status } : r));
    const onCancelled = () => {
      setActiveRide(null);
      setAssignedDriver(null);
      setDriverPos(null);
      setViewers(0);
    };
    // Live position of the assigned driver streamed to the ride room.
    const onDriverLocation = (p: any) => {
      if (typeof p?.lng === 'number' && typeof p?.lat === 'number') setDriverPos({ lng: p.lng, lat: p.lat });
    };
    // How many drivers are currently viewing the pending request.
    const onViewers = (p: any) => setViewers(p?.count ?? 0);
    socket.on('ride:accepted', onAccepted);
    socket.on('ride:updated', onUpdated);
    socket.on('ride:status', onStatus);
    socket.on('ride:cancelled', onCancelled);
    socket.on('driver:location', onDriverLocation);
    socket.on('ride:viewers', onViewers);
    return () => {
      socket.off('ride:accepted', onAccepted);
      socket.off('ride:updated', onUpdated);
      socket.off('ride:status', onStatus);
      socket.off('ride:cancelled', onCancelled);
      socket.off('driver:location', onDriverLocation);
      socket.off('ride:viewers', onViewers);
    };
  }, [token]);

  // Join the ride room so we receive the driver's live location.
  useEffect(() => {
    if (!token || !activeRide) return;
    const socket = connectSocket(token);
    socket.emit('ride:join', activeRide._id);
    return () => {
      socket.emit('ride:leave', activeRide._id);
    };
  }, [token, activeRide?._id]);

  // Self-heal: poll the active ride so the assigned driver (name/phone/avatar)
  // appears even if the ride:accepted socket event was missed.
  useEffect(() => {
    if (!token || !activeRide) return;
    const id = setInterval(async () => {
      try {
        const { ride } = await getActiveRide(token);
        if (ride) {
          setActiveRide(ride);
          if (ride.driver && typeof ride.driver === 'object') {
            setAssignedDriver(ride.driver);
            const c = ride.driver?.driver?.lastLocation?.coordinates;
            if (c) setDriverPos({ lng: c[0], lat: c[1] });
          }
        }
      } catch {
        /* ignore */
      }
    }, 6000);
    return () => clearInterval(id);
  }, [token, activeRide?._id]);

  // Poll nearby online drivers while idle (inDrive-style cars on the map).
  useEffect(() => {
    if (!token || activeRide) {
      setNearby([]);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const { drivers } = await getNearbyDrivers(token, pickup.coords);
        if (!cancelled) setNearby(drivers);
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, activeRide, pickup.coords]);

  useEffect(() => {
    if (!activeRide) return;
    if (activeRide.status === 'completed' && !activeRide.passengerRating?.stars) {
      // Show rating prompt immediately; clear ride when the user rates or skips.
      setCompletedRide(activeRide);
    } else if (['completed', 'cancelled', 'expired'].includes(activeRide.status)) {
      const id = setTimeout(() => {
        setActiveRide(null);
        setAssignedDriver(null);
        setDriverPos(null);
      }, 3000);
      return () => clearTimeout(id);
    }
  }, [activeRide?.status]);

  const estimateRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!token || !destination) {
      setFare(null);
      return;
    }
    setEstimating(true);
    const t = setTimeout(async () => {
      estimateRef.current?.abort();
      const ctrl = new AbortController();
      estimateRef.current = ctrl;
      try {
        const { fare } = await estimateFare(token, pickup.coords, destination.coords, ctrl.signal);
        setFare(fare);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setFare(null);
      } finally {
        setEstimating(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [token, pickup, destination]);

  const onRequest = useCallback(async () => {
    if (!token || !destination) return;
    setRequesting(true);
    setError(null);
    try {
      const { ride } = await createRide(
        token,
        { address: pickup.address, ...pickup.coords },
        { address: `${destination.name} — ${destination.address}`, ...destination.coords },
        passengers
      );
      setActiveRide(ride);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('booking.requestFailed'));
    } finally {
      setRequesting(false);
    }
  }, [token, destination, pickup, passengers]);

  const onRatingDone = useCallback(() => {
    setCompletedRide(null);
    setActiveRide(null);
    setAssignedDriver(null);
    setDriverPos(null);
  }, []);

  const onCancel = useCallback(async () => {
    if (!token || !activeRide) return;
    try {
      await cancelRide(token, activeRide._id);
      setActiveRide(null);
      setAssignedDriver(null);
    } catch {
      /* ignore */
    }
  }, [token, activeRide]);

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <Pressable style={s.iconBtn} onPress={() => router.push('/(passenger)/menu')} hitSlop={8}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </Pressable>
          <Wordmark size={20} />
          <Pressable onPress={() => router.push('/(passenger)/(tabs)/profile')}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatar} contentFit="cover" />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <LiveMap
        dark={scheme === 'dark'}
        viewerRole="passenger"
        label={activeRide ? statusLabel(t, activeRide.status) : undefined}
        user={{ lat: pickup.coords.lat, lng: pickup.coords.lng }}
        drivers={activeRide ? [] : nearby}
        pickup={activeRide ? { lat: pickup.coords.lat, lng: pickup.coords.lng } : null}
        destination={activeRide && destination ? { lat: destination.coords.lat, lng: destination.coords.lng } : null}
        assignedDriver={driverPos}
        followAssigned={!!driverPos && activeRide?.status !== 'started'}
        center={{ lat: pickup.coords.lat, lng: pickup.coords.lng }}
      />

      <View style={s.sheet}>
        <View style={s.grabber} />
        {activeRide ? (
          <ActiveRideCard
            ride={activeRide}
            driver={assignedDriver || activeRide.driver}
            viewers={viewers}
            onCancel={onCancel}
            onMessage={() => setChatOpen(true)}
          />
        ) : (
          <>
            <View style={s.locations}>
              <Pressable onPress={() => setPicking('pickup')}>
                <LocationRow
                  dot={<View style={[s.pin, { backgroundColor: colors.primary }]} />}
                  label={t('booking.from')}
                  value={pickup.address}
                  chevron
                />
              </Pressable>
              <View style={s.divider} />
              <Pressable onPress={() => setPicking('destination')}>
                <LocationRow
                  dot={<Ionicons name="location" size={18} color={colors.text} />}
                  label={t('booking.destination')}
                  value={destination ? `${destination.name} — ${destination.address}` : t('booking.chooseDestination')}
                  muted={!destination}
                  chevron
                />
              </Pressable>
            </View>

            {/* Passenger count (petit taxi: 1–3) */}
            <View style={s.paxRow}>
              <View style={s.paxLeft}>
                <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
                <Text style={s.paxLabel}>{t('booking.passengers')}</Text>
              </View>
              <View style={s.paxPicker}>
                {[1, 2, 3].map((n) => {
                  const active = passengers === n;
                  return (
                    <Pressable key={n} onPress={() => setPassengers(n)} style={[s.paxChip, active && s.paxChipActive]}>
                      <Text style={[s.paxChipText, active && s.paxChipTextActive]}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {destination ? (
              <View style={s.fareCard}>
                <View style={s.fareRow}>
                  <View style={s.fareLeft}>
                    <Ionicons name="pricetag" size={18} color={colors.primary} />
                    <Text style={s.fareLabel}>{t('booking.estimatedFare')}</Text>
                  </View>
                  {estimating || !fare ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={s.farePrice}>{formatMAD(fare.total)}</Text>
                  )}
                </View>
                {fare ? (
                  <Text style={s.fareBasis}>
                    {t('booking.fareBasis', {
                      perKm: fare.perKm.toFixed(2),
                      pickup: fare.pickupCharge.toFixed(2),
                      period: fare.period === 'night' ? t('booking.night') : t('booking.day'),
                    })}{' '}
                    <Text style={s.fareLegal}>{t('booking.regulated')}</Text>
                  </Text>
                ) : null}
              </View>
            ) : null}

            {error ? <Text style={s.error}>{error}</Text> : null}

            <Button label={t('booking.requestTaxi')} onPress={onRequest} disabled={!destination || !fare} loading={requesting} />
          </>
        )}
      </View>

      <PlacePicker
        target={picking}
        onClose={() => setPicking(null)}
        onUseCurrent={() => {
          locateMe();
          setPicking(null);
        }}
        onSelect={(p) => {
          if (picking === 'pickup') setPickup(p);
          else setDestination(p);
          setPicking(null);
        }}
      />

      {activeRide ? (
        <RideChat
          rideId={activeRide._id}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          title={t('chat.withDriver')}
        />
      ) : null}

      {completedRide && token ? (
        <RatingModal ride={completedRide} token={token} onDone={onRatingDone} />
      ) : null}
    </View>
  );
}

function LocationRow({
  dot,
  label,
  value,
  muted,
  chevron,
}: {
  dot: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  chevron?: boolean;
}) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <View style={s.locRow}>
      <View style={s.locIcon}>{dot}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.locLabel}>{label}</Text>
        <Text style={[s.locValue, muted && { color: colors.textMuted, fontWeight: '400' }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </View>
  );
}

function ActiveRideCard({
  ride,
  driver,
  viewers,
  onCancel,
  onMessage,
}: {
  ride: Ride;
  driver: any;
  viewers: number;
  onCancel: () => void;
  onMessage: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { startCall, supported } = useCall();
  const s = useStyles();
  const terminal = ['completed', 'cancelled', 'expired'].includes(ride.status);
  // A driver is assigned once the ride is accepted (or further). Show the card
  // even if the driver hasn't filled in a name/phone.
  const assigned = ['accepted', 'arrived', 'started', 'completed'].includes(ride.status);
  const hasDriver = assigned && !!driver;
  const plate = driver?.driver?.vehicle?.plate || driver?.vehicle?.plate;
  const driverName = driver?.fullName || t('auth.driver');
  return (
    <View style={{ gap: Spacing.md }}>
      <View style={s.statusRow}>
        {!terminal && <ActivityIndicator color={colors.primary} />}
        <Text style={s.statusText}>{statusLabel(t, ride.status)}</Text>
      </View>

      {ride.status === 'requested' && viewers > 0 ? (
        <View style={s.viewersRow}>
          <Ionicons name="eye-outline" size={16} color={colors.primary} />
          <Text style={s.viewersText}>{t('booking.viewers', { n: viewers })}</Text>
        </View>
      ) : null}

      {hasDriver ? (
        <View style={s.driverCard}>
          {driver.avatarUrl ? (
            <Image source={{ uri: driver.avatarUrl }} style={s.driverAvatar} contentFit="cover" />
          ) : (
            <View style={s.driverAvatar}>
              <Ionicons name="person" size={20} color={colors.onPrimary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.driverName}>{driver.fullName || t('auth.driver')}</Text>
            <Text style={s.driverMeta}>{plate || t('driver.taxi')}</Text>
          </View>
          <Text style={s.farePrice}>{formatMAD(ride.fare.total)}</Text>
        </View>
      ) : null}

      {hasDriver && !terminal ? (
        <View style={s.contactRow}>
          <Button
            label={t('common.call')}
            variant="outline"
            onPress={() => (supported ? startCall(ride._id, driverName) : Alert.alert('TaxiLik.ma', t('call.unsupported')))}
            icon={<Ionicons name="call" size={18} color={colors.primary} />}
            style={{ flex: 1 }}
          />
          <Button
            label={t('common.message')}
            onPress={onMessage}
            icon={<Ionicons name="chatbubble-ellipses" size={18} color={colors.onPrimary} />}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      {!terminal ? <Button label={t('booking.cancelRide')} variant="secondary" onPress={onCancel} /> : null}
    </View>
  );
}

function PlacePicker({
  target,
  onClose,
  onSelect,
  onUseCurrent,
}: {
  target: 'pickup' | 'destination' | null;
  onClose: () => void;
  onSelect: (p: Place) => void;
  onUseCurrent: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = useStyles();
  const isPickup = target === 'pickup';
  return (
    <Modal visible={target !== null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalSheet}>
          <View style={s.grabber} />
          <Text style={s.modalTitle}>{isPickup ? t('booking.choosePickup') : t('booking.chooseTitle')}</Text>
          {isPickup ? (
            <Pressable style={s.placeRow} onPress={onUseCurrent}>
              <View style={s.placeIcon}>
                <Ionicons name="locate" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.placeName}>{t('booking.useCurrent')}</Text>
                <Text style={s.placeAddr}>{t('booking.currentPosition')}</Text>
              </View>
            </Pressable>
          ) : null}
          <FlatList
            data={CASABLANCA_PLACES}
            keyExtractor={(item) => item.name}
            ItemSeparatorComponent={() => <View style={s.divider} />}
            renderItem={({ item }) => (
              <Pressable style={s.placeRow} onPress={() => onSelect(item)}>
                <View style={s.placeIcon}>
                  <Ionicons name="location-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.placeName}>{item.name}</Text>
                  <Text style={s.placeAddr}>{item.address}</Text>
                </View>
              </Pressable>
            )}
          />
          <Button label={t('common.close')} variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function useStyles() {
  return useThemedStyles((c, scheme) => ({
    root: { flex: 1, backgroundColor: c.background },
    headerSafe: { backgroundColor: c.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.margin,
      paddingVertical: Spacing.sm,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: c.onPrimary, ...Type.labelLg },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      padding: Spacing.margin,
      paddingBottom: Spacing.xl,
      gap: Spacing.md,
      ...shadow(scheme, 'sheet'),
    },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: Spacing.xs },
    locations: { backgroundColor: c.surfaceAlt, borderRadius: Radius.lg, paddingHorizontal: Spacing.md },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
    locIcon: { width: 24, alignItems: 'center' },
    pin: { width: 14, height: 14, borderRadius: 7 },
    locLabel: { ...Type.labelSm, color: c.textMuted },
    locValue: { ...Type.bodyMd, color: c.text, fontWeight: '600' },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 40 },
    paxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    paxLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    paxLabel: { ...Type.labelLg, color: c.text },
    paxPicker: { flexDirection: 'row', gap: Spacing.sm },
    paxChip: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    paxChipActive: { borderColor: c.primary, backgroundColor: c.primaryContainer },
    paxChipText: { ...Type.labelLg, color: c.textSecondary },
    paxChipTextActive: { color: c.primary },
    viewersRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: c.surfaceAlt, borderRadius: Radius.md, padding: Spacing.sm },
    viewersText: { ...Type.labelMd, color: c.textSecondary, flex: 1 },
    fareCard: {
      backgroundColor: c.primaryContainer,
      borderWidth: 1,
      borderColor: c.primaryBorder,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    fareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fareLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    fareLabel: { ...Type.labelLg, color: c.text },
    farePrice: { ...Type.headlineMd, color: c.primary, fontWeight: '800' },
    fareBasis: { ...Type.labelSm, color: c.textSecondary, lineHeight: 17 },
    fareLegal: { color: c.primary, fontWeight: '700' },
    error: { ...Type.labelMd, color: c.error },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    statusText: { ...Type.headlineMd, color: c.text, flex: 1 },
    driverCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: c.surfaceAlt,
      borderRadius: Radius.lg,
      padding: Spacing.md,
    },
    driverAvatar: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    driverName: { ...Type.labelLg, color: c.text },
    driverMeta: { ...Type.labelSm, color: c.textSecondary },
    contactRow: { flexDirection: 'row', gap: Spacing.sm },
    modalBackdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      padding: Spacing.margin,
      maxHeight: '72%',
      gap: Spacing.md,
    },
    modalTitle: { ...Type.headlineMd, color: c.text },
    placeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
    placeIcon: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeName: { ...Type.bodyMd, color: c.text, fontWeight: '700' },
    placeAddr: { ...Type.labelSm, color: c.textSecondary },
  }));
}
