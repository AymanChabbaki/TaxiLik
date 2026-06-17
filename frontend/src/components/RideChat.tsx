import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { connectSocket } from '@/lib/socket';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

interface Msg {
  id: string;
  text: string;
  from: 'passenger' | 'driver';
  mine: boolean;
  at: string;
}

export function RideChat({
  rideId,
  open,
  onClose,
  title,
}: {
  rideId: string;
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = useStyles();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    socket.emit('ride:join', rideId);
    const onMessage = (p: any) => {
      if (p?.rideId !== rideId) return;
      // Own messages are already shown optimistically — skip the server echo.
      if (p.senderId === user?.id) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `${p.at}-${p.senderId}-${Math.random().toString(36).slice(2, 6)}`,
          text: p.text,
          from: p.from,
          mine: false,
          at: p.at,
        },
      ]);
    };
    socket.on('chat:message', onMessage);
    return () => {
      socket.off('chat:message', onMessage);
    };
  }, [token, rideId, user?.id]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  function send() {
    const value = text.trim();
    if (!value || !token) return;
    // Optimistic: show my message immediately, then send.
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: value,
        from: (user?.role as 'passenger' | 'driver') ?? 'passenger',
        mine: true,
        at: new Date().toISOString(),
      },
    ]);
    connectSocket(token).emit('chat:message', { rideId, text: value });
    setText('');
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <SafeAreaView style={s.sheet} edges={['bottom']}>
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={s.close}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={8}
          >
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={s.list}
              ListEmptyComponent={<Text style={s.empty}>{t('chat.empty')}</Text>}
              renderItem={({ item }) => (
                <View style={[s.bubbleRow, item.mine ? s.rowMine : s.rowTheirs]}>
                  <View style={[s.bubble, item.mine ? s.bubbleMine : s.bubbleTheirs]}>
                    <Text style={[s.bubbleText, item.mine && { color: colors.onPrimary }]}>{item.text}</Text>
                  </View>
                </View>
              )}
            />

            <View style={s.inputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={colors.textMuted}
                style={s.input}
                onSubmitEditing={send}
                returnKeyType="send"
                multiline
              />
              <Pressable onPress={send} style={s.sendBtn}>
                <Ionicons name="send" size={18} color={colors.onPrimary} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function useStyles() {
  return useThemedStyles((c) => ({
    backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      height: '75%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.margin,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { ...Type.headlineMd, color: c.text },
    close: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    list: { padding: Spacing.margin, gap: Spacing.sm, flexGrow: 1 },
    empty: { ...Type.bodyMd, color: c.textMuted, textAlign: 'center', marginTop: Spacing.xl },
    bubbleRow: { flexDirection: 'row' },
    rowMine: { justifyContent: 'flex-end' },
    rowTheirs: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '78%', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.lg },
    bubbleMine: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
    bubbleTheirs: { backgroundColor: c.surfaceAlt, borderBottomLeftRadius: 4 },
    bubbleText: { ...Type.bodyMd, color: c.text },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      ...Type.bodyMd,
      color: c.text,
      backgroundColor: c.surfaceAlt,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  }));
}
