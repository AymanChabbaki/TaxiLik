import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Wordmark } from '@/components/Logo';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { submitDocument, updateVehicle, uploadFile } from '@/lib/driver';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';
import type { TranslationKey } from '@/lib/translations';
import type { DocType } from '@/lib/types';

const DOCS: { type: DocType; title: TranslationKey; desc: TranslationKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'cin', title: 'driver.onb.cin', desc: 'driver.onb.cinDesc', icon: 'card-outline' },
  { type: 'permis', title: 'driver.onb.permis', desc: 'driver.onb.permisDesc', icon: 'id-card-outline' },
  { type: 'carte_grise', title: 'driver.onb.carteGrise', desc: 'driver.onb.carteGriseDesc', icon: 'document-text-outline' },
  { type: 'assurance', title: 'driver.onb.assurance', desc: 'driver.onb.assuranceDesc', icon: 'shield-checkmark-outline' },
  { type: 'permis_confiance', title: 'driver.onb.confiance', desc: 'driver.onb.confianceDesc', icon: 'ribbon-outline' },
];

export default function OnboardingScreen() {
  const { user, token, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const s = useStyles();

  const [uploading, setUploading] = useState<DocType | null>(null);
  const [plate, setPlate] = useState(user?.driver?.vehicle?.plate ?? '');
  const [license, setLicense] = useState(user?.driver?.vehicle?.licenseNumber ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docs = user?.driver?.documents ?? [];
  const status = user?.driver?.approvalStatus ?? 'incomplete';
  const docFor = (t: DocType) => docs.find((d) => d.type === t);
  const uploadedCount = DOCS.filter((d) => docFor(d.type)).length;
  const allUploaded = uploadedCount === DOCS.length;
  const pending = status === 'pending';

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    const onApproval = () => refreshUser();
    socket.on('driver:approval', onApproval);
    return () => {
      socket.off('driver:approval', onApproval);
    };
  }, [token, refreshUser]);

  useEffect(() => {
    if (status === 'approved') router.replace('/(driver)');
  }, [status, router]);

  async function pickAndUpload(type: DocType) {
    if (!token) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('driver.onb.permTitle'), t('driver.onb.permRequired'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploading(type);
      setError(null);
      const { url } = await uploadFile(token, {
        uri: asset.uri,
        name: asset.fileName || `${type}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      await submitDocument(token, type, url);
      await refreshUser();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('driver.onb.uploadError'));
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit() {
    if (!token) return;
    if (!plate.trim() || !license.trim()) {
      setError(t('driver.onb.vehicleError'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateVehicle(token, plate.trim(), license.trim());
      await refreshUser();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('driver.onb.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.topbar}>
          <Wordmark size={18} />
          <Button label={t('driver.onb.quit')} variant="ghost" size="md" onPress={async () => { disconnectSocket(); await signOut(); }} style={{ paddingHorizontal: 0 }} />
        </View>

        <View>
          <Text style={s.title}>{t('driver.onb.title')}</Text>
          <Text style={s.subtitle}>{t('driver.onb.subtitle')}</Text>
        </View>

        <View style={s.progressCard}>
          <View style={s.progressRing}>
            <Text style={s.progressText}>{uploadedCount}/5</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.progressTitle}>{t('driver.onb.progress')}</Text>
            <Text style={s.progressSub}>{t('driver.onb.progressSub', { n: uploadedCount })}</Text>
          </View>
        </View>

        {pending ? (
          <View style={s.pendingBanner}>
            <Ionicons name="hourglass-outline" size={20} color={colors.warning} />
            <Text style={s.pendingText}>{t('driver.onb.pending')}</Text>
          </View>
        ) : null}

        {DOCS.map((doc) => {
          const submitted = docFor(doc.type);
          const rejected = submitted?.status === 'rejected';
          const isUploading = uploading === doc.type;
          return (
            <View key={doc.type} style={s.docCard}>
              <View style={s.docHeader}>
                <View style={s.docIcon}>
                  <Ionicons name={doc.icon} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.docTitle}>{t(doc.title)}</Text>
                  {submitted ? (
                    <Text style={[s.docStatus, { color: rejected ? colors.error : colors.success }]}>
                      {rejected ? t('driver.onb.rejected') : submitted.status === 'approved' ? t('driver.onb.validated') : t('driver.onb.uploaded')}
                    </Text>
                  ) : (
                    <Text style={s.docDesc}>{t(doc.desc)}</Text>
                  )}
                  {rejected && submitted?.rejectionReason ? <Text style={s.rejectReason}>{submitted.rejectionReason}</Text> : null}
                </View>
                {submitted && !rejected ? <Ionicons name="checkmark-circle" size={24} color={colors.success} /> : null}
              </View>
              <Button
                label={submitted ? t('driver.onb.replace') : t('driver.onb.addPhoto')}
                variant="outline"
                size="md"
                loading={isUploading}
                onPress={() => pickAndUpload(doc.type)}
                icon={!isUploading ? <Ionicons name="camera-outline" size={18} color={colors.primary} /> : undefined}
              />
            </View>
          );
        })}

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('driver.onb.vehicle')}</Text>
          <TextField label={t('driver.onb.plate')} placeholder="12345-A-6" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
          <TextField label={t('driver.onb.license')} placeholder="CASA-0000" value={license} onChangeText={setLicense} autoCapitalize="characters" />
        </View>

        <View style={s.legalCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={s.legalText}>{t('driver.onb.legal')}</Text>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {!pending ? (
          <>
            <Button label={t('driver.onb.submit')} onPress={onSubmit} disabled={!allUploaded || submitting} loading={submitting} />
            {!allUploaded ? <Text style={s.hint}>{t('driver.onb.incomplete')}</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function useStyles() {
  return useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.margin, gap: Spacing.md, paddingBottom: Spacing.xl },
    topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...Type.headlineLg, color: c.text },
    subtitle: { ...Type.bodyMd, color: c.textSecondary, marginTop: Spacing.xs },
    progressCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md },
    progressRing: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    progressText: { ...Type.labelLg, color: c.primary },
    progressTitle: { ...Type.labelLg, color: c.text },
    progressSub: { ...Type.labelSm, color: c.textSecondary },
    pendingBanner: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: c.primaryContainer, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'flex-start' },
    pendingText: { ...Type.labelMd, color: c.warning, flex: 1 },
    docCard: { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: Spacing.md },
    docHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    docIcon: { width: 46, height: 46, borderRadius: Radius.md, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    docTitle: { ...Type.labelLg, color: c.text },
    docDesc: { ...Type.labelSm, color: c.textSecondary },
    docStatus: { ...Type.labelSm, fontWeight: '800' },
    rejectReason: { ...Type.labelSm, color: c.error, marginTop: 2 },
    section: { gap: Spacing.md, marginTop: Spacing.sm },
    sectionTitle: { ...Type.headlineMd, color: c.text },
    legalCard: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: c.primaryContainer, borderWidth: 1, borderColor: c.primaryBorder, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'flex-start' },
    legalText: { ...Type.labelMd, color: c.textSecondary, flex: 1 },
    error: { ...Type.labelMd, color: c.error },
    hint: { ...Type.labelSm, color: c.textMuted, textAlign: 'center' },
  }));
}
