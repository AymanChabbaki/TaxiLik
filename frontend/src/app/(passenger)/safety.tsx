import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { TextField } from '@/components/TextField';
import { useI18n } from '@/lib/i18n';
import { storage } from '@/lib/storage';
import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

const CONTACT_KEY = 'taxilik.emergencyContact';

interface Contact {
  name: string;
  phone: string;
}

export default function SafetyScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const s = useStyles();

  const [contact, setContact] = useState<Contact | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    storage.get(CONTACT_KEY).then((raw) => {
      if (raw) {
        try {
          const c = JSON.parse(raw) as Contact;
          setContact(c);
          setName(c.name);
          setPhone(c.phone);
        } catch {
          /* ignore */
        }
      }
    });
  }, []);

  async function saveContact() {
    if (!name.trim() || !phone.trim()) return;
    const c = { name: name.trim(), phone: phone.trim() };
    await storage.set(CONTACT_KEY, JSON.stringify(c));
    setContact(c);
    setEditing(false);
  }

  const call = (number: string) => Linking.openURL(`tel:${number}`);

  return (
    <View style={s.safe}>
      <PageHeader title={t('safety.title')} />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.subtitle}>{t('safety.subtitle')}</Text>

        {/* Emergency */}
        <Text style={s.label}>{t('safety.emergency')}</Text>
        <Button
          label={t('safety.call15')}
          onPress={() => call('15')}
          icon={<Ionicons name="call" size={20} color={colors.onPrimary} />}
        />

        {/* Trusted contact */}
        <Text style={s.label}>{t('safety.contact')}</Text>
        {editing || !contact ? (
          <View style={s.card}>
            <TextField label={t('safety.contactName')} value={name} onChangeText={setName} placeholder={t('safety.contactName')} />
            <TextField label={t('safety.contactPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('auth.phonePlaceholder')} />
            <Button label={t('safety.saveContact')} onPress={saveContact} size="md" />
          </View>
        ) : (
          <View style={s.card}>
            <View style={s.contactRow}>
              <View style={s.contactAvatar}>
                <Ionicons name="person" size={20} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.contactName}>{contact.name}</Text>
                <Text style={s.contactPhone}>{contact.phone}</Text>
              </View>
              <Ionicons name="create-outline" size={22} color={colors.textMuted} onPress={() => setEditing(true)} />
            </View>
            <Button
              label={t('safety.callContact', { name: contact.name })}
              variant="outline"
              size="md"
              onPress={() => call(contact.phone)}
              icon={<Ionicons name="call-outline" size={18} color={colors.primary} />}
            />
          </View>
        )}

        {/* Tips */}
        <Text style={s.label}>{t('safety.tips')}</Text>
        <View style={s.card}>
          {([t('safety.tip1'), t('safety.tip2'), t('safety.tip3')]).map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={s.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function useStyles() {
  return useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.margin, gap: Spacing.sm },
    subtitle: { ...Type.bodyMd, color: c.textSecondary, marginBottom: Spacing.sm },
    label: { ...Type.labelSm, color: c.textMuted, marginTop: Spacing.md },
    card: { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: Spacing.md },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    contactAvatar: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    contactName: { ...Type.labelLg, color: c.text },
    contactPhone: { ...Type.labelSm, color: c.textSecondary },
    tipRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    tipText: { ...Type.bodyMd, color: c.textSecondary, flex: 1 },
  }));
}
