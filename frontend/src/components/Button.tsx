import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from 'react-native';

import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'lg' | 'md';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  style,
  icon,
}: ButtonProps) {
  const { colors } = useTheme();
  const s = useThemedStyles((c) => ({
    base: {
      height: 56,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
    },
    md: { height: 46, borderRadius: Radius.md },
    primary: { backgroundColor: c.primary },
    secondary: { backgroundColor: c.surfaceAlt },
    outline: { borderWidth: 1.5, borderColor: c.border, backgroundColor: 'transparent' },
    ghost: { backgroundColor: 'transparent' },
    content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    label: { ...Type.labelLg },
    labelPrimary: { color: c.onPrimary },
    labelDark: { color: c.text },
    labelAccent: { color: c.primary },
  }));

  const isDisabled = disabled || loading;
  const labelColor =
    variant === 'primary' ? s.labelPrimary : variant === 'ghost' ? s.labelAccent : s.labelDark;
  const spinnerColor = variant === 'primary' ? colors.onPrimary : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.base,
        size === 'md' && s.md,
        s[variant],
        pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        isDisabled && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={s.content}>
          {icon}
          <Text style={[s.label, labelColor]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
