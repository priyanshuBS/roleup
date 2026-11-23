import { describe, expect, it } from 'vitest';
import {
  domainFromUrl,
  formatInrCompact,
  formatInrRange,
  formatUsdCompact,
  slugify,
  timeAgo,
} from './format';

describe('format', () => {
  it('formats INR in lakhs and crores', () => {
    expect(formatInrCompact(2_450_000)).toBe('24.5L');
    expect(formatInrCompact(1_000_000)).toBe('10L');
    expect(formatInrCompact(15_000_000)).toBe('1.5Cr');
    expect(formatInrRange(1_800_000, 3_200_000)).toBe('₹18–32L');
    expect(formatInrRange(null, null)).toBeNull();
  });
  it('formats USD compact', () => {
    expect(formatUsdCompact(20_000_000)).toBe('$20M');
    expect(formatUsdCompact(1_500_000_000)).toBe('$1.5B');
  });
  it('time ago', () => {
    const now = new Date('2026-01-10T12:00:00Z');
    expect(timeAgo(new Date('2026-01-10T11:59:30Z'), now)).toBe('just now');
    expect(timeAgo(new Date('2026-01-10T10:00:00Z'), now)).toBe('2h ago');
    expect(timeAgo(new Date('2026-01-07T12:00:00Z'), now)).toBe('3d ago');
    expect(timeAgo(null, now)).toBe('—');
  });
  it('slugify and domain', () => {
    expect(slugify('Senior Software Engineer, Backend (Go) — Bengaluru')).toBe(
      'senior-software-engineer-backend-go-bengaluru',
    );
    expect(slugify('R&D')).toBe('r-and-d');
    expect(domainFromUrl('https://www.Stripe.com/jobs')).toBe('stripe.com');
    expect(domainFromUrl('razorpay.com')).toBe('razorpay.com');
    expect(domainFromUrl('')).toBeNull();
  });
});
