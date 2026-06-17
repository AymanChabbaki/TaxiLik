import { Alert, Linking, Platform } from 'react-native';

// Place a phone call. On native this opens the dialer; on web (no dialer) we
// surface the number so the user can dial it manually.
export async function callNumber(phone?: string | null) {
  if (!phone) return;
  const num = String(phone).replace(/[^\d+]/g, '');
  if (!num) return;
  const url = `tel:${num}`;
  try {
    if (Platform.OS === 'web') {
      // Try to trigger the OS handler; many desktops do nothing, so also show it.
      window.location.href = url;
      window.alert(num);
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert(num);
  } catch {
    if (Platform.OS === 'web') window.alert(num);
    else Alert.alert(num);
  }
}
