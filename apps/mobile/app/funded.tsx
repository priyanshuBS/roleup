import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { daysBetween, formatInrCompact, formatUsdCompact } from '@roleup/core/lite';
import { api } from '@/api';
import { Button, CompanyLogo, Empty } from '@/components/ui';
import { tabular, type, useTheme } from '@/theme';

export default function FundedScreen() {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['funding'], queryFn: ({ signal }) => api.funding(signal) });
  if (q.isPending) return <ActivityIndicator style={{ marginTop: 32 }} color={c.textSubtle} />;
  if (q.isError)
    return (
      <Empty
        title="Couldn't load funding"
        detail={q.error.message}
        action={<Button label="Try again" onPress={() => void q.refetch()} />}
      />
    );
  const seen = new Set<number>();
  const items = q.data.items.filter((f) =>
    seen.has(f.company.id) ? false : (seen.add(f.company.id), true),
  );
  const now = new Date();
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      data={items}
      keyExtractor={(x) => String(x.id)}
      ListEmptyComponent={<Empty title="No reviewed funding rounds yet" />}
      renderItem={({ item: f }) => {
        const amount = [
          f.amountInr ? `₹${formatInrCompact(f.amountInr).replace('₹', '')}` : null,
          f.amountUsd ? formatUsdCompact(f.amountUsd) : null,
        ]
          .filter(Boolean)
          .join(' · ');
        const days = daysBetween(new Date(f.announcedOn), now);
        return (
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              backgroundColor: c.surface,
            }}
          >
            <CompanyLogo
              name={f.company.name}
              domain={f.company.domain}
              logoUrl={f.company.logoUrl}
              size={32}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[type.base, { color: c.text, fontWeight: '600' }]}>
                  {f.company.name}
                </Text>
                <Text style={[type.xs, tabular, { color: c.textSubtle }]}>
                  {days === 0 ? 'today' : `${days}d ago`}
                </Text>
              </View>
              <Text style={[type.sm, tabular, { color: c.textMuted }]}>
                {f.round === 'Undisclosed' ? 'Funding round' : f.round}
                {amount ? ` · ${amount}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                {f.company.openJobsCount > 0 ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/list',
                        params: { title: f.company.name, company: f.company.slug },
                      })
                    }
                    accessibilityRole="link"
                  >
                    <Text style={[type.sm, { color: c.accent }]}>
                      {f.company.openJobsCount} open jobs
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={[type.sm, { color: c.textSubtle }]}>No open jobs tracked</Text>
                )}
                <Pressable
                  onPress={() => void WebBrowser.openBrowserAsync(f.sourceUrl)}
                  accessibilityRole="link"
                >
                  <Text style={[type.xs, { color: c.textMuted }]}>Source: {f.sourceName}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}
