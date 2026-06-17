import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Radius } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export function AvatarPicker({ size = 96 }: { size?: number }) {
  const { user, uploadAvatar } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function pick() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('driver.onb.permTitle'), t('driver.onb.permRequired'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setBusy(true);
      await uploadAvatar({
        uri: asset.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
    } catch {
      Alert.alert('TaxiLik.ma', t('driver.onb.uploadError'));
    } finally {
      setBusy(false);
    }
  }

  const initial = (user?.fullName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <Pressable onPress={pick} style={{ width: size, height: size }}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary }]}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
        ) : (
          <Text style={[styles.initial, { fontSize: size * 0.4, color: colors.onPrimary }]}>{initial}</Text>
        )}
        {busy ? (
          <View style={[styles.overlay, { borderRadius: size / 2 }]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>
      <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.background }]}>
        <Ionicons name="camera" size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { fontWeight: '800' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
