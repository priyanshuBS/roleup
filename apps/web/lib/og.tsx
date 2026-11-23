/**
 * Shared renderer for social share images (Open Graph / Twitter cards) and PNG app icons, drawn
 * with next/og. Colours are fixed to the light palette: messaging apps show share images on
 * their own backgrounds, independent of the visitor's theme.
 */
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

const INK = '#161616';
const MUTED = '#4D4D55';
const BORDER = '#E7E5DF';
const BRAND = '#D9480F';
const BG = '#FAFAF7';

/**
 * The brand mark. `bleed`: full-square background with the chevrons inside the central safe
 * zone, for OS icons (iOS/Android round the corners themselves; transparent corners turn black).
 */
function Mark({ size, bleed = false }: { size: number; bleed?: boolean }) {
  // Scale the artwork toward the centre on bleed icons so it survives circular masks.
  const t = bleed ? 'translate(16 16) scale(0.78) translate(-16 -16)' : undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx={bleed ? 0 : 8} fill={BRAND} />
      <g transform={t}>
        <path
          d="M10 15.5 16 9.5l6 6"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 22.5 16 16.5l6 6"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.55"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** Square app icon (apple-touch-icon, manifest icons). */
export function iconImage(size: number) {
  return new ImageResponse(<Mark size={size} bleed />, { width: size, height: size });
}

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export function ogImage({
  eyebrow,
  title,
  subtitle,
  pills = [],
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  pills?: string[];
}) {
  const t = clip(title, 90);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: BG,
        borderTop: `14px solid ${BRAND}`,
        fontFamily: 'sans-serif',
        color: INK,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Mark size={52} />
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 600, letterSpacing: -1 }}>
          RoleUp
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 28, color: MUTED }}>{clip(eyebrow, 60)}</div>
        <div
          style={{
            display: 'flex',
            marginTop: 14,
            fontSize: t.length > 50 ? 62 : 78,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: -2.5,
          }}
        >
          {t}
        </div>
        {subtitle && (
          <div style={{ display: 'flex', marginTop: 22, fontSize: 30, color: MUTED }}>
            {clip(subtitle, 110)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {pills.slice(0, 4).map((p) => (
          <div
            key={p}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 48,
              padding: '0 20px',
              borderRadius: 10,
              fontSize: 24,
              fontWeight: 500,
              background: '#FFFFFF',
              color: INK,
              border: `1px solid ${BORDER}`,
            }}
          >
            {clip(p, 32)}
          </div>
        ))}
      </div>
    </div>,
    OG_SIZE,
  );
}
