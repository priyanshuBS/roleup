/**
 * Generate the Expo app icons in apps/mobile/assets from the RoleUp mark (same artwork as
 * app/icon.svg). Run from apps/web:  node scripts/gen-mobile-icons.mjs
 *
 *   icon.png              1024² full-bleed (iOS + legacy Android; no transparency)
 *   adaptive-icon.png     1024² transparent foreground, artwork inside the 66% safe zone
 *   adaptive-mono.png     1024² monochrome foreground for Android 13+ themed icons
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { ImageResponse } from 'next/og.js';

const BRAND = '#D9480F';
const out = fileURLToPath(new URL('../../mobile/assets/', import.meta.url));
mkdirSync(out, { recursive: true });

function chevrons(scale, colorTop, colorBottom, bottomOpacity) {
  const t = `translate(16 16) scale(${scale}) translate(-16 -16)`;
  const common = {
    fill: 'none',
    strokeWidth: 3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  return h(
    'g',
    { transform: t },
    h('path', { d: 'M10 15.5 16 9.5l6 6', stroke: colorTop, ...common }),
    h('path', {
      d: 'M10 22.5 16 16.5l6 6',
      stroke: colorBottom,
      strokeOpacity: bottomOpacity,
      ...common,
    }),
  );
}

async function png(name, svgChildren, background) {
  const size = 1024;
  const el = h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        background: background ?? 'transparent',
      },
    },
    h('svg', { width: size, height: size, viewBox: '0 0 32 32' }, ...svgChildren),
  );
  const res = new ImageResponse(el, { width: size, height: size });
  writeFileSync(out + name, Buffer.from(await res.arrayBuffer()));
  console.log('wrote', out + name);
}

// Full-bleed: background fills the square; the OS rounds the corners.
await png(
  'icon.png',
  [h('rect', { width: 32, height: 32, fill: BRAND }), chevrons(0.78, '#fff', '#fff', 0.55)],
  BRAND,
);
// Adaptive foreground: launcher masks show the central ~66%; keep artwork well inside.
await png('adaptive-icon.png', [chevrons(0.62, '#fff', '#fff', 0.55)]);
// Themed (monochrome) icon: Android tints this single-colour layer.
await png('adaptive-mono.png', [chevrons(0.62, '#000', '#000', 0.55)]);
