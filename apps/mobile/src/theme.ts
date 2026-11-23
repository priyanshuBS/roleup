import { useColorScheme } from 'react-native';
import { fontSize, palette, radius, space } from '@roleup/ui-tokens';

export type Colors = (typeof palette)['light'] | (typeof palette)['dark'];

/** Same tokens as the website, so the app and site look like one product. */
export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, c: palette[scheme] as Colors, space, radius };
}

export const type = {
  xs: { fontSize: fontSize.xs[0], lineHeight: fontSize.xs[1] },
  sm: { fontSize: fontSize.sm[0], lineHeight: fontSize.sm[1] },
  base: { fontSize: fontSize.base[0], lineHeight: fontSize.base[1] },
  md: { fontSize: fontSize.md[0], lineHeight: fontSize.md[1] },
  lg: { fontSize: fontSize.lg[0], lineHeight: fontSize.lg[1] },
  xl: { fontSize: fontSize.xl[0], lineHeight: fontSize.xl[1] },
  '2xl': { fontSize: fontSize['2xl'][0], lineHeight: fontSize['2xl'][1] },
} as const;

export const tabular = { fontVariant: ['tabular-nums'] as 'tabular-nums'[] };
