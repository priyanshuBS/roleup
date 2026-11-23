import { describe, expect, it } from 'vitest';
import { activeFilterCount, filtersToQuery, parseJobFilters } from './filters';

describe('parseJobFilters', () => {
  it('parses valid values from URLSearchParams', () => {
    const f = parseJobFilters(
      new URLSearchParams(
        'q=react&category=frontend&city=bengaluru&remote=remote_india&band=20to40&posted=7d&limit=20',
      ),
    );
    expect(f).toMatchObject({
      q: 'react',
      category: 'frontend',
      city: 'bengaluru',
      remote: 'remote_india',
      band: '20to40',
      posted: '7d',
      limit: 20,
    });
  });
  it('drops invalid values instead of throwing', () => {
    const f = parseJobFilters({
      category: 'chef',
      level: 'god',
      city: 'DROP TABLE',
      limit: '9999',
      band: ['lt10', 'x'],
    });
    expect(f.category).toBeUndefined();
    expect(f.level).toBeUndefined();
    expect(f.city).toBeUndefined();
    expect(f.band).toBe('lt10');
    expect(f.limit).toBe(30);
  });
  it('trims and caps search text', () => {
    expect(parseJobFilters({ q: '   ' }).q).toBeUndefined();
    expect(parseJobFilters({ q: 'a'.repeat(300) }).q).toHaveLength(100);
  });
});

describe('filtersToQuery', () => {
  it('serializes in a stable order and skips empty', () => {
    expect(filtersToQuery({ city: 'pune', q: 'go', level: undefined })).toBe('q=go&city=pune');
  });
  it('counts active filters', () => {
    expect(activeFilterCount({ q: 'x', city: 'pune', level: undefined })).toBe(2);
  });
});
