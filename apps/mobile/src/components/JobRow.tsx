import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { layout } from '@roleup/ui-tokens';
import { LEVEL_LABELS, timeAgo, type JobListItem } from '@roleup/core/lite';
import { locationLabel, salaryLabel } from '../format';
import { tabular, type, useTheme } from '../theme';
import { CompanyLogo } from './ui';

/** Fixed height so FlatList can use getItemLayout. */
export const JOB_ROW_HEIGHT = layout.jobRowHeight;

export const JobRow = memo(function JobRow({ job, now }: { job: JobListItem; now: Date }) {
  const { c } = useTheme();
  const salary = salaryLabel(job);
  const meta = [job.company.name, locationLabel(job), LEVEL_LABELS[job.level]].join(' · ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/job/[id]', params: { id: String(job.id) } })}
      accessibilityRole="link"
      accessibilityLabel={`${job.title} at ${job.company.name}`}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: c.border, backgroundColor: pressed ? c.surfaceMuted : c.surface },
      ]}
    >
      <CompanyLogo
        name={job.company.name}
        domain={job.company.domain}
        logoUrl={job.company.logoUrl}
      />
      <View style={styles.body}>
        <Text numberOfLines={1} style={[type.base, { color: c.text, fontWeight: '500' }]}>
          {job.title}
        </Text>
        <Text numberOfLines={1} style={[type.sm, { color: c.textMuted }]}>
          {meta}
        </Text>
        <Text numberOfLines={1} style={[type.xs, tabular, { color: c.textSubtle }]}>
          {timeAgo(job.postedAt ?? job.firstSeenAt, now)}
          {salary ? <Text style={{ color: c.text }}>{`  ·  ${salary}`}</Text> : null}
          {job.company.tags.includes('yc') ? (
            <Text
              style={{ color: c.accent }}
            >{`  ·  YC${job.company.ycBatch ? ` ${job.company.ycBatch}` : ''}`}</Text>
          ) : null}
        </Text>
      </View>
    </Pressable>
  );
});

export function SkeletonRow() {
  const { c } = useTheme();
  return (
    <View
      style={[styles.row, { borderBottomColor: c.border, backgroundColor: c.surface }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ width: 28, height: 28, borderRadius: 4, backgroundColor: c.surfaceMuted }} />
      <View style={styles.body}>
        <View
          style={{ height: 12, width: '70%', borderRadius: 3, backgroundColor: c.surfaceMuted }}
        />
        <View
          style={{
            height: 10,
            width: '50%',
            borderRadius: 3,
            backgroundColor: c.surfaceMuted,
            marginTop: 8,
          }}
        />
        <View
          style={{
            height: 8,
            width: '25%',
            borderRadius: 3,
            backgroundColor: c.surfaceMuted,
            marginTop: 8,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: JOB_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
});
