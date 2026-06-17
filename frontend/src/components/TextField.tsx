import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme, useThemedStyles } from '@/lib/theme-context';
import { Radius, Spacing, Type } from '@/lib/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  leading?: React.ReactNode;
}

export function TextField({ label, error, leading, style, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const s = useThemedStyles((c) => ({
    wrap: { gap: Spacing.xs },
    label: { ...Type.labelMd, color: c.textSecondary },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      height: 56,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      backgroundColor: c.surfaceAlt,
    },
    fieldFocused: { borderColor: c.primary, backgroundColor: c.surface },
    fieldError: { borderColor: c.error },
    input: { flex: 1, ...Type.bodyLg, fontWeight: '500', color: c.text, paddingVertical: 0 },
    errorText: { ...Type.labelSm, color: c.error },
  }));

  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.field, focused && s.fieldFocused, error && s.fieldError]}>
        {leading}
        <TextInput
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[s.input, style]}
          {...props}
        />
      </View>
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}
