import { describe, expect, it } from 'vitest';
import {
  deviceFromUa,
  eventSchema,
  isBot,
  isIgnoredPath,
  referrerHost,
  visitorHash,
} from './analytics';

const CHROME_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const ANDROID_TAB =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/142.0 Safari/537.36';

describe('analytics helpers', () => {
  it('detects bots and devices', () => {
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot('Chrome-Lighthouse')).toBe(true);
    expect(isBot('')).toBe(true);
    expect(isBot(CHROME_WIN)).toBe(false);
    expect(deviceFromUa(CHROME_WIN)).toBe('desktop');
    expect(deviceFromUa(IPHONE)).toBe('mobile');
    expect(deviceFromUa(ANDROID_TAB)).toBe('tablet');
  });

  it('keeps only external referrer hosts', () => {
    expect(referrerHost('https://www.google.co.in/search?q=x', 'roleup.in')).toBe('google.com');
    expect(referrerHost('https://www.linkedin.com/feed/', 'roleup.in')).toBe('linkedin.com');
    expect(referrerHost('https://roleup.in/jobs', 'roleup.in')).toBeNull();
    expect(referrerHost('not a url', 'roleup.in')).toBeNull();
    expect(referrerHost(undefined, 'roleup.in')).toBeNull();
  });

  it('visitor hash is stable within a day and changes across days', () => {
    const d1 = new Date('2026-11-23T10:00:00Z');
    const d1b = new Date('2026-11-23T15:00:00Z');
    const d2 = new Date('2026-11-24T10:00:00Z');
    const a = visitorHash('s', '1.2.3.4', CHROME_WIN, d1);
    expect(a).toBe(visitorHash('s', '1.2.3.4', CHROME_WIN, d1b));
    expect(a).not.toBe(visitorHash('s', '1.2.3.4', CHROME_WIN, d2));
    expect(a).not.toBe(visitorHash('s', '1.2.3.5', CHROME_WIN, d1));
    expect(a).not.toContain('1.2.3.4');
  });

  it('validates payloads and ignores admin/API paths', () => {
    expect(eventSchema.safeParse({ t: 'view', p: '/jobs/in/pune/' }).data?.p).toBe('/jobs/in/pune');
    expect(eventSchema.safeParse({ t: 'view', p: 'https://evil.com' }).success).toBe(false);
    expect(eventSchema.safeParse({ t: 'hover', p: '/' }).success).toBe(false);
    expect(isIgnoredPath('/admin/funding')).toBe(true);
    expect(isIgnoredPath('/api/v1/jobs')).toBe(true);
    expect(isIgnoredPath('/administrator-jobs')).toBe(false);
  });
});
