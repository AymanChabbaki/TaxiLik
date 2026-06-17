import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LogoImage } from '@/components/Logo';

// Casablanca Petit Taxi red — the brand colour, used full-bleed here.
const TAXI_RED = '#E8412A';
// Legal positioning tagline, in Moroccan Darija.
const DARIJA_TAGLINE = 'Lḥall l-qanoni dyal naql f Casablanca';

function Dot({ delay }: { delay: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function SplashLoader() {
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [enter]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.9 + enter.value * 0.1 }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <LogoImage width={260} tintColor="#FFFFFF" />
        </Animated.View>
        <Animated.Text style={[styles.tagline, tagStyle]}>{DARIJA_TAGLINE}</Animated.Text>
      </View>

      <View style={styles.loader}>
        <Dot delay={0} />
        <Dot delay={160} />
        <Dot delay={320} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TAXI_RED, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 18 },
  tagline: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    opacity: 0.95,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loader: { position: 'absolute', bottom: 56, flexDirection: 'row', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
});
