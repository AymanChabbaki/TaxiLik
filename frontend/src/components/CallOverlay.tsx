import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';

import { useCall } from '@/lib/call';
import { useI18n } from '@/lib/i18n';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useThemedStyles } from '@/lib/theme-context';

export function CallOverlay() {
  const { state, peerName, muted, acceptCall, declineCall, endCall, toggleMute } = useCall();
  const { t } = useI18n();
  const s = useStyles();

  const visible = state !== 'idle';
  const statusText =
    state === 'calling' ? t('call.calling') : state === 'ringing' ? t('call.incoming') : t('call.connected');

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={declineCall}>
      <View style={s.backdrop}>
        <View style={s.content}>
          <View style={s.avatar}>
            <Ionicons name="person" size={48} color="#fff" />
          </View>
          <Text style={s.name}>{peerName || t('call.voiceCall')}</Text>
          <Text style={s.status}>{statusText}</Text>

          {state === 'ringing' ? (
            <View style={s.actions}>
              <CallBtn icon="close" color="#EF4444" label={t('call.decline')} onPress={declineCall} />
              <CallBtn icon="call" color="#22C55E" label={t('call.accept')} onPress={acceptCall} />
            </View>
          ) : (
            <View style={s.actions}>
              {state === 'connected' ? (
                <CallBtn
                  icon={muted ? 'mic-off' : 'mic'}
                  color="rgba(255,255,255,0.18)"
                  label={muted ? t('call.unmute') : t('call.mute')}
                  onPress={toggleMute}
                />
              ) : null}
              <CallBtn icon="call" color="#EF4444" label={t('call.hangup')} rotate onPress={endCall} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function CallBtn({
  icon,
  color,
  label,
  onPress,
  rotate,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
  rotate?: boolean;
}) {
  const s = useStyles();
  return (
    <Pressable onPress={onPress} style={s.btnWrap}>
      <View style={[s.btn, { backgroundColor: color }]}>
        <Ionicons name={icon} size={26} color="#fff" style={rotate ? { transform: [{ rotate: '135deg' }] } : undefined} />
      </View>
      <Text style={s.btnLabel}>{label}</Text>
    </Pressable>
  );
}

function useStyles() {
  return useThemedStyles(() => ({
    backdrop: { flex: 1, backgroundColor: 'rgba(10,12,16,0.96)', alignItems: 'center', justifyContent: 'center' },
    content: { alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
    avatar: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    name: { ...Type.headlineLg, color: '#fff' },
    status: { ...Type.bodyLg, color: 'rgba(255,255,255,0.65)', marginBottom: Spacing.xl },
    actions: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.lg },
    btnWrap: { alignItems: 'center', gap: Spacing.sm },
    btn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    btnLabel: { ...Type.labelMd, color: 'rgba(255,255,255,0.8)' },
  }));
}
