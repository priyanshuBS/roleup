import { describe, expect, it } from 'vitest';
import { isNeonUrl } from './client';

describe('isNeonUrl', () => {
  it('detects Neon hosts', () => {
    expect(
      isNeonUrl(
        'postgresql://u:p@ep-cool-1234-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require',
      ),
    ).toBe(true);
  });
  it('treats local and other hosts as plain Postgres', () => {
    expect(isNeonUrl('postgres://postgres:postgres@127.0.0.1:5433/postgres')).toBe(false);
    expect(isNeonUrl('postgres://x@neon.tech.evil.com/db')).toBe(false);
    expect(isNeonUrl('not a url')).toBe(false);
  });
});
