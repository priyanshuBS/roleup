import { describe, expect, it } from 'vitest';
import { buildTokensCss, cssVarName, palette } from './index';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('ui-tokens', () => {
  it('maps token names to css vars', () => {
    expect(cssVarName('textMuted')).toBe('--color-text-muted');
  });
  it('light and dark define the same tokens', () => {
    expect(Object.keys(palette.dark).sort()).toEqual(Object.keys(palette.light).sort());
  });
  it('generated tokens.css is up to date', () => {
    const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');
    expect(css).toBe(buildTokensCss());
  });
});
