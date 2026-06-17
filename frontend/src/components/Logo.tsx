import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme-context';
import { Type } from '@/lib/theme';

const LOGO = require('../../assets/images/logo.png');

// Full logo image (taxi mark + wordmark). Pass `tintColor` to render it as a
// monochrome silhouette (e.g. white on the red splash) — the pin/wheel cut-outs
// stay transparent so the background shows through.
export function LogoImage({ width = 200, tintColor }: { width?: number; tintColor?: string }) {
  return (
    <Image
      source={LOGO}
      tintColor={tintColor}
      style={{ width, height: width * 0.5 }}
      contentFit="contain"
    />
  );
}

// Compact text wordmark for headers/tight spaces.
export function Wordmark({ size = 22 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.text, { fontSize: size, color: colors.text }]}>TaxiLik</Text>
      <Text style={[styles.text, { fontSize: size, color: colors.primary }]}>.ma</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  text: { ...Type.headlineLg, fontWeight: '800' },
});
