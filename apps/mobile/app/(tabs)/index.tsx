import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { ROLE_CATEGORY_LABELS, type RoleCategory } from '@roleup/core/lite';
import type { JobQuery } from '@/api';
import { JobFeed } from '@/components/JobFeed';
import { Chip } from '@/components/ui';
import { type, useTheme } from '@/theme';

const QUICK: { label: string; q: JobQuery }[] = [
  { label: 'Remote (India OK)', q: { remote: 'remote_india' } },
  { label: 'Bengaluru', q: { city: 'bengaluru' } },
  { label: 'Delhi NCR', q: { city: 'delhi-ncr' } },
  { label: 'Hyderabad', q: { city: 'hyderabad' } },
  { label: 'Pune', q: { city: 'pune' } },
  { label: 'YC', q: { tag: 'yc' } },
  { label: 'Last 7 days', q: { posted: '7d' } },
];

const CATS: RoleCategory[] = [
  'backend',
  'frontend',
  'fullstack',
  'mobile',
  'data',
  'ml_ai',
  'devops',
  'security',
  'qa',
  'product',
  'design',
];

export default function LatestScreen() {
  const { c } = useTheme();
  const [quick, setQuick] = useState<number | null>(null);
  const [category, setCategory] = useState<RoleCategory | null>(null);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');

  const query = useMemo<JobQuery>(
    () => ({
      ...(quick !== null ? QUICK[quick]!.q : {}),
      ...(category ? { category } : {}),
      ...(search ? { q: search } : {}),
    }),
    [quick, category, search],
  );
  const isDefault = quick === null && !category && !search;

  const header = (
    <View style={{ backgroundColor: c.surface, borderBottomColor: c.border, borderBottomWidth: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setSearch(text.trim())}
          placeholder="Search title, company, skill"
          placeholderTextColor={c.textSubtle}
          returnKeyType="search"
          accessibilityLabel="Search jobs"
          style={[
            type.base,
            {
              height: 40,
              borderWidth: 1,
              borderColor: c.borderStrong,
              borderRadius: 6,
              paddingHorizontal: 12,
              color: c.text,
              backgroundColor: c.bg,
            },
          ]}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, padding: 12, paddingHorizontal: 16 }}
      >
        {QUICK.map((f, i) => (
          <Chip
            key={f.label}
            label={f.label}
            active={quick === i}
            onPress={() => setQuick(quick === i ? null : i)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 12, paddingHorizontal: 16 }}
      >
        {CATS.map((cat) => (
          <Chip
            key={cat}
            label={ROLE_CATEGORY_LABELS[cat]}
            active={category === cat}
            onPress={() => setCategory(category === cat ? null : cat)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return <JobFeed query={query} header={header} offlineCache={isDefault} />;
}
