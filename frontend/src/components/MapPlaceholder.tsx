import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

// Decorative "streets" — a few soft lines suggesting a city grid.
function Streets({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[
        { top: '18%', left: '-10%', width: '120%', rotate: '-12deg', h: 10 },
        { top: '52%', left: '-10%', width: '120%', rotate: '-12deg', h: 16 },
        { top: '78%', left: '-10%', width: '120%', rotate: '-12deg', h: 8 },
        { top: '-20%', left: '30%', width: 12, rotate: '-12deg', h: '140%' as any },
        { top: '-20%', left: '68%', width: 8, rotate: '-12deg', h: '140%' as any },
      ].map((seg, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: seg.top as any,
            left: seg.left as any,
            width: seg.width as any,
            height: seg.h as any,
            backgroundColor: color,
            opacity: 0.5,
            borderRadius: 4,
            transform: [{ rotate: seg.rotate }],
          }}
        />
      ))}
    </View>
  );
}

function PulsingPin({ color }: { color: string }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.6, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false);
  }, [scale, opacity]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pinWrap}>
      <Animated.View style={[styles.ring, { backgroundColor: color }, ring]} />
      <View style={[styles.pinDot, { backgroundColor: color }]}>
        <Ionicons name="navigate" size={18} color="#FFFFFF" />
      </View>
    </View>
  );
}

export function MapPlaceholder({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.map}>
      <LinearGradient colors={[colors.mapTop, colors.mapBottom]} style={StyleSheet.absoluteFill} />
      <Streets color={colors.mapStreet} />
      <PulsingPin color={colors.primary} />
      {label ? (
        <View style={[styles.chip, { backgroundColor: colors.surface }]}>
          <View style={[styles.chipDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pinWrap: { alignItems: 'center', justifyContent: 'center', width: 80, height: 80 },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40 },
  pinDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    position: 'absolute',
    top: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { ...Type.labelMd },
});
