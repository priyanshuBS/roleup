import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { REMOTE_TYPE_LABELS } from '@roleup/core/lite';
import { api, type JobQuery } from '@/api';
import { Chip, SectionTitle } from '@/components/ui';
import { getRecentFilters, pushRecentFilter, type RecentFilter } from '@/storage';
import { tabular, type, useTheme } from '@/theme';

function openList(title: string, query: JobQuery) {
  void pushRecentFilter({ title, query });
  router.push({ pathname: '/list', params: { title, ...query } });
}

function Row({ title, detail, onPress }: { title: string; detail?: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? c.surfaceMuted : c.surface,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      })}
    >
      <Text style={[type.base, { color: c.text }]}>{title}</Text>
      {detail ? <Text style={[type.sm, tabular, { color: c.textSubtle }]}>{detail}</Text> : null}
    </Pressable>
  );
}

export default function ExploreScreen() {
  const { c } = useTheme();
  const meta = useQuery({ queryKey: ['meta'], queryFn: ({ signal }) => api.meta(signal) });
  const [recent, setRecent] = useState<RecentFilter[]>([]);
  useFocusEffect(
    useCallback(() => {
      void getRecentFilters().then(setRecent);
    }, []),
  );
  const m = meta.data;
  const count = (v: string) => m?.remote.find((r) => r.value === v)?.count;
  const n = (x?: number) => (x === undefined ? undefined : x.toLocaleString('en-IN'));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {recent.length > 0 && (
        <>
          <SectionTitle>Recent</SectionTitle>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
          >
            {recent.map((r) => (
              <Chip key={r.title} label={r.title} onPress={() => openList(r.title, r.query)} />
            ))}
          </ScrollView>
        </>
      )}

      <SectionTitle>Collections</SectionTitle>
      <View style={{ borderTopWidth: 1, borderTopColor: c.border }}>
        <Row
          title="YC companies"
          detail={n(m?.tags.find((t) => t.value === 'yc')?.count)}
          onPress={() => openList('YC companies', { tag: 'yc' })}
        />
        <Row title="Recently funded" onPress={() => router.push('/funded')} />
        <Row title="Companies" onPress={() => router.push('/companies')} />
      </View>

      <SectionTitle>Remote</SectionTitle>
      <View style={{ borderTopWidth: 1, borderTopColor: c.border }}>
        {(['remote_india', 'remote_global', 'remote_restricted'] as const).map((r) => (
          <Row
            key={r}
            title={REMOTE_TYPE_LABELS[r]}
            detail={n(count(r))}
            onPress={() => openList(REMOTE_TYPE_LABELS[r], { remote: r })}
          />
        ))}
      </View>

      <SectionTitle>Salary (per year)</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
        {(m?.bands ?? []).map((b) => (
          <Chip
            key={b.value}
            label={b.label}
            count={b.count}
            onPress={() => openList(b.label, { band: b.value })}
          />
        ))}
      </View>

      <SectionTitle>Cities</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
        {(m?.cities ?? []).map((city) => (
          <Chip
            key={city.slug}
            label={city.name}
            count={city.count}
            onPress={() => openList(city.name, { city: city.slug })}
          />
        ))}
      </View>

      {m && m.ycBatches.length > 0 && (
        <>
          <SectionTitle>YC batches</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
            {m.ycBatches.map((b) => (
              <Chip
                key={b.batch}
                label={b.batch}
                count={b.count}
                onPress={() => openList(`YC ${b.batch}`, { tag: 'yc', batch: b.batch })}
              />
            ))}
          </View>
        </>
      )}
      {meta.isError && (
        <Text style={[type.sm, { color: c.danger, margin: 16 }]}>
          Couldn&apos;t load counts. Pull down on Latest to retry.
        </Text>
      )}
    </ScrollView>
  );
}
