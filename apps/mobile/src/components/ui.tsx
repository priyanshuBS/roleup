import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme, type } from '../theme';

export function CompanyLogo({
  name,
  domain,
  logoUrl,
  size = 28,
}: {
  name: string;
  domain: string | null;
  logoUrl: string | null;
  size?: number;
}) {
  const { c } = useTheme();
  const [failed, setFailed] = useState(false);
  const src = logoUrl ?? (domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : null);
  const box = {
    width: size,
    height: size,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  };
  if (!src || failed) {
    const initials = name
      .replace(/[^A-Za-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    return (
      <View
        style={[box, styles.center, { backgroundColor: c.surfaceMuted }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <Text style={{ fontSize: Math.round(size * 0.38), color: c.textMuted, fontWeight: '500' }}>
          {initials || '?'}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      style={[box, { backgroundColor: c.surface }]}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

export function Chip({
  label,
  onPress,
  active,
  count,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  count?: number;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: active ? c.accent : c.border,
          backgroundColor: active ? c.accentSubtle : pressed ? c.surfaceMuted : c.surface,
        },
      ]}
    >
      <Text style={[type.sm, { color: active ? c.accent : c.textMuted }]}>
        {label}
        {count !== undefined ? (
          <Text style={{ color: c.textSubtle }}>{`  ${count.toLocaleString('en-IN')}`}</Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  primary,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary
            ? pressed
              ? c.accentHover
              : c.accent
            : pressed
              ? c.surfaceMuted
              : c.surface,
          borderColor: primary ? c.accent : c.borderStrong,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      <Text style={[type.sm, { fontWeight: '600', color: primary ? c.accentText : c.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 32, alignItems: 'center', gap: 6 }}>
      <Text style={[type.base, { color: c.text, fontWeight: '500', textAlign: 'center' }]}>
        {title}
      </Text>
      {detail ? (
        <Text style={[type.sm, { color: c.textMuted, textAlign: 'center' }]}>{detail}</Text>
      ) : null}
      {action}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <Text
      style={[
        type.xs,
        {
          color: c.textSubtle,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 20,
          marginBottom: 8,
          marginHorizontal: 16,
        },
      ]}
    >
      {children}
    </Text>
  );
}

export const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  button: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
