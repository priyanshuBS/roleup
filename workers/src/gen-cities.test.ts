import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITIES } from '@roleup/core';
import { repoPath } from './lib/paths';

describe('data/cities.json', () => {
  it('is in sync with packages/core (run `pnpm --filter @roleup/workers gen:cities`)', () => {
    expect(JSON.parse(readFileSync(repoPath('data/cities.json'), 'utf8'))).toEqual(CITIES);
  });
});
