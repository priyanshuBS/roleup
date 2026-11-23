/**
 * On-device storage (AsyncStorage). Saved jobs, recent filters and the last loaded feed never
 * leave the phone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { JobListItem } from '@roleup/core/lite';
import type { JobQuery } from './api';

const SAVED_KEY = 'roleup:saved:v1';
const RECENT_KEY = 'roleup:recent-filters:v1';
const FEED_KEY = 'roleup:feed-cache:v1';

export interface SavedJob {
  id: number;
  slug: string;
  title: string;
  companyName: string;
  location: string;
  salary: string | null;
  savedAt: string;
}

/* ---------- saved jobs: tiny external store over AsyncStorage ---------- */

let saved: SavedJob[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function loadSaved() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    saved = Array.isArray(parsed) ? (parsed as SavedJob[]) : [];
  } catch {
    saved = [];
  }
  emit();
}

function persist() {
  AsyncStorage.setItem(SAVED_KEY, JSON.stringify(saved)).catch(() => undefined);
  emit();
}

export function useSavedJobs(): SavedJob[] {
  useEffect(() => {
    void loadSaved();
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => saved,
  );
}

export function useIsSaved(id: number) {
  const list = useSavedJobs();
  const isSaved = list.some((j) => j.id === id);
  const toggle = useCallback((job: Omit<SavedJob, 'savedAt'>) => {
    if (saved.some((j) => j.id === job.id)) saved = saved.filter((j) => j.id !== job.id);
    else saved = [{ ...job, savedAt: new Date().toISOString() }, ...saved].slice(0, 500);
    persist();
  }, []);
  return { isSaved, toggle };
}

export function removeSaved(id: number) {
  saved = saved.filter((j) => j.id !== id);
  persist();
}

/* ---------- recent filters ---------- */

export interface RecentFilter {
  title: string;
  query: JobQuery;
}

export async function getRecentFilters(): Promise<RecentFilter[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentFilter[]) : [];
  } catch {
    return [];
  }
}

export async function pushRecentFilter(f: RecentFilter) {
  const list = (await getRecentFilters()).filter(
    (x) => JSON.stringify(x.query) !== JSON.stringify(f.query),
  );
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify([f, ...list].slice(0, 6))).catch(
    () => undefined,
  );
}

/* ---------- offline feed cache ---------- */

export async function getCachedFeed(): Promise<{ items: JobListItem[]; savedAt: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(FEED_KEY);
    return raw ? (JSON.parse(raw) as { items: JobListItem[]; savedAt: string }) : null;
  } catch {
    return null;
  }
}

export function cacheFeed(items: JobListItem[]) {
  AsyncStorage.setItem(
    FEED_KEY,
    JSON.stringify({ items: items.slice(0, 60), savedAt: new Date().toISOString() }),
  ).catch(() => undefined);
}
