/** Regenerates data/cities.json from packages/core/src/data/cities.ts. */
import { writeFileSync } from 'node:fs';
import { CITIES } from '@roleup/core';
import { repoPath } from './lib/paths';

writeFileSync(repoPath('data/cities.json'), `${JSON.stringify(CITIES, null, 2)}\n`);
console.log(`wrote ${CITIES.length} cities`);
