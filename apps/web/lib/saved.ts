'use client';

/**
 * Saved jobs live only in this browser (localStorage). We keep a small snapshot so the
 * Saved page renders instantly and still works if a job later closes.
 */
import { useSyncExternalStore } from 'react';

export interface SavedJob {
  id: number;
  slug: string;
  title: string;
  companyName: string;
  companySlug: string;
  location: string;
  salary: string | null;
  savedAt: string;
}

const KEY = 'roleup-saved-v1';
const EVENT = 'roleup-saved-change';
const EMPTY: SavedJob[] = [];
let cache: { raw: string | null; value: SavedJob[] } = { raw: null, value: EMPTY };

function read(): SavedJob[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.value;
  let value: SavedJob[] = EMPTY;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? (parsed as SavedJob[]) : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache = { raw, value };
  return value;
}

function write(list: SavedJob[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSavedJobs(): SavedJob[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function toggleSaved(job: Omit<SavedJob, 'savedAt'>): boolean {
  const list = read();
  if (list.some((j) => j.id === job.id)) {
    write(list.filter((j) => j.id !== job.id));
    return false;
  }
  write([{ ...job, savedAt: new Date().toISOString() }, ...list].slice(0, 500));
  return true;
}

export function removeSaved(id: number) {
  write(read().filter((j) => j.id !== id));
}

export function clearSaved() {
  write([]);
}
