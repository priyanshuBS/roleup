import { fileURLToPath } from 'node:url';

/** Absolute path inside the repo, from a repo-root-relative path. */
export function repoPath(rel: string): string {
  return fileURLToPath(new URL(`../../../${rel}`, import.meta.url));
}
