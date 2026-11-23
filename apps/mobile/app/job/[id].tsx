import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { LEVEL_LABELS, REMOTE_TYPE_LABELS, ROLE_CATEGORY_LABELS, timeAgo } from '@roleup/core/lite';
import { api } from '@/api';
import { Button, CompanyLogo, Empty } from '@/components/ui';
import { locationLabel, salaryLabel } from '@/format';
import { useIsSaved } from '@/storage';
import { tabular, type, useTheme } from '@/theme';

/** Renders stored plain text: "• " lines as bullets, blank lines as paragraph breaks. */
function Description({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {text.split('\n').map((raw, i) => {
        const line = raw.trim();
        if (!line) return <View key={i} style={{ height: 6 }} />;
        const bullet = /^[•\-*·]\s+(.*)$/.exec(line);
        return bullet ? (
          <View key={i} style={{ flexDirection: 'row', gap: 8, paddingLeft: 4 }}>
            <Text style={[type.base, { color: c.textSubtle }]}>•</Text>
            <Text style={[type.base, { color: c.text, flex: 1 }]}>{bullet[1]}</Text>
          </View>
        ) : (
          <Text key={i} style={[type.base, { color: c.text }]}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const q = useQuery({
    queryKey: ['job', id],
    queryFn: ({ signal }) => api.job(id, signal),
    enabled: !!id,
  });
  const { isSaved, toggle } = useIsSaved(Number(id));

  if (q.isPending) return <ActivityIndicator style={{ marginTop: 32 }} color={c.textSubtle} />;
  if (q.isError)
    return (
      <Empty
        title={
          q.error.message === 'Job not found'
            ? 'This job is no longer available'
            : "Couldn't load this job"
        }
        detail={q.error.message}
        action={<Button label="Back" onPress={() => router.back()} />}
      />
    );

  const job = q.data;
  const salary = salaryLabel(job);
  const location = locationLabel(job);
  const facts: [string, string][] = [
    ['Level', `${LEVEL_LABELS[job.level]}${job.minYears != null ? ` · ${job.minYears}+ yrs` : ''}`],
    ['Role', ROLE_CATEGORY_LABELS[job.roleCategory]],
    ['Work mode', REMOTE_TYPE_LABELS[job.remoteType]],
    ['Salary', salary ? `${salary} /yr` : 'Not disclosed'],
  ];

  return (
    <>
      <Stack.Screen options={{ title: job.company.name }} />
      <ScrollView
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      >
        {job.closedAt && (
          <View style={{ padding: 12, borderRadius: 6, backgroundColor: c.warningSubtle }}>
            <Text style={[type.sm, { color: c.warning }]}>
              This job is closed. It was removed from the company&apos;s board{' '}
              {timeAgo(job.closedAt)}.
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <CompanyLogo
            name={job.company.name}
            domain={job.company.domain}
            logoUrl={job.company.logoUrl}
            size={44}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[type.xl, { color: c.text, fontWeight: '600' }]}
              accessibilityRole="header"
            >
              {job.title}
            </Text>
            <Text style={[type.sm, { color: c.textMuted, marginTop: 2 }]}>
              {job.company.name} · {location}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 6,
            backgroundColor: c.surface,
          }}
        >
          {facts.map(([k, v]) => (
            <View key={k} style={{ width: '50%', padding: 12 }}>
              <Text style={[type.xs, { color: c.textSubtle }]}>{k}</Text>
              <Text style={[type.sm, tabular, { color: c.text, fontWeight: '500' }]}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 8 }}>
          {!job.closedAt && (
            <Button
              primary
              label="Apply on company site"
              onPress={() => void WebBrowser.openBrowserAsync(job.applyUrl)}
            />
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              style={{ flex: 1 }}
              label={isSaved ? 'Saved' : 'Save'}
              onPress={() =>
                toggle({
                  id: job.id,
                  slug: job.slug,
                  title: job.title,
                  companyName: job.company.name,
                  location,
                  salary,
                })
              }
            />
            <Button
              style={{ flex: 1 }}
              label="Check my resume"
              onPress={() =>
                router.push({
                  pathname: '/ats',
                  params: { job: job.slug, jobTitle: `${job.title} at ${job.company.name}` },
                })
              }
            />
          </View>
        </View>

        <Text style={[type.xs, tabular, { color: c.textSubtle }]}>
          Posted {timeAgo(job.postedAt ?? job.firstSeenAt)} · Last checked {timeAgo(job.lastSeenAt)}
        </Text>

        <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 16 }}>
          <Description
            text={
              job.descriptionText || 'No description provided. See the company site for details.'
            }
          />
        </View>
      </ScrollView>
    </>
  );
}
