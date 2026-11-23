import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { formatCount, timeAgo, type JobListItem } from '@roleup/core/lite';
import { api, type JobQuery } from '../api';
import { cacheFeed, getCachedFeed } from '../storage';
import { tabular, type, useTheme } from '../theme';
import { JOB_ROW_HEIGHT, JobRow, SkeletonRow } from './JobRow';
import { Button, Empty } from './ui';

/**
 * Infinite, cursor-paginated job list. With `offlineCache`, the first page is persisted and
 * shown immediately on cold start (and when offline) while fresh data loads.
 */
export function JobFeed({
  query,
  header,
  offlineCache = false,
}: {
  query: JobQuery;
  header?: React.ReactElement;
  offlineCache?: boolean;
}) {
  const { c } = useTheme();
  const [cached, setCached] = useState<{ items: JobListItem[]; savedAt: string } | null>(null);
  const key = useMemo(() => ['jobs', query], [query]);

  useEffect(() => {
    if (offlineCache) void getCachedFeed().then(setCached);
  }, [offlineCache]);

  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) => api.jobs(query, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const fresh = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  useEffect(() => {
    if (offlineCache && fresh.length) cacheFeed(fresh);
  }, [offlineCache, fresh]);

  const showingCache = !q.data && !!cached?.items.length;
  const items = showingCache ? cached!.items : fresh;
  const total = q.data?.pages[0]?.total;
  const now = useMemo(() => new Date(q.dataUpdatedAt || Date.now()), [q.dataUpdatedAt]);

  const listHeader = (
    <View>
      {header}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {showingCache ? (
          <Text style={[type.xs, { color: c.warning }]}>
            {q.isError ? 'Offline. ' : ''}Showing jobs saved {timeAgo(cached!.savedAt)}.
          </Text>
        ) : total !== undefined ? (
          <Text style={[type.xs, tabular, { color: c.textSubtle }]}>
            {formatCount(total)} open tech jobs
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (q.isPending && !showingCache) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {header}
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    );
  }

  if (q.isError && !showingCache) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {header}
        <Empty
          title="Couldn't load jobs"
          detail={q.error.message}
          action={
            <Button label="Try again" onPress={() => void q.refetch()} style={{ marginTop: 12 }} />
          }
        />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      data={items}
      keyExtractor={(j) => String(j.id)}
      renderItem={({ item }) => <JobRow job={item} now={now} />}
      getItemLayout={(_, index) => ({
        length: JOB_ROW_HEIGHT,
        offset: JOB_ROW_HEIGHT * index,
        index,
      })}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={<Empty title="No open jobs match" detail="Try a different filter." />}
      ListFooterComponent={
        q.isFetchingNextPage ? (
          <ActivityIndicator style={{ margin: 16 }} color={c.textSubtle} />
        ) : undefined
      }
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={q.isRefetching && !q.isFetchingNextPage}
          onRefresh={() => void q.refetch()}
          tintColor={c.textSubtle}
        />
      }
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews
    />
  );
}
