import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { timeAgo } from '@roleup/core/lite';
import { Empty } from '@/components/ui';
import { removeSaved, useSavedJobs } from '@/storage';
import { type, useTheme } from '@/theme';

export default function SavedScreen() {
  const { c } = useTheme();
  const saved = useSavedJobs();
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      data={saved}
      keyExtractor={(j) => String(j.id)}
      ListHeaderComponent={
        <Text style={[type.xs, { color: c.textSubtle, padding: 16, paddingBottom: 8 }]}>
          Saved on this phone only. Nothing is sent to our servers.
        </Text>
      }
      ListEmptyComponent={
        <Empty title="No saved jobs yet" detail="Open a job and tap Save to keep it here." />
      }
      renderItem={({ item }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: c.border,
            backgroundColor: c.surface,
          }}
        >
          <Pressable
            style={{ flex: 1, padding: 16, gap: 2 }}
            onPress={() => router.push({ pathname: '/job/[id]', params: { id: String(item.id) } })}
            accessibilityRole="link"
          >
            <Text style={[type.base, { color: c.text, fontWeight: '500' }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[type.sm, { color: c.textMuted }]} numberOfLines={1}>
              {item.companyName} · {item.location}
              {item.salary ? ` · ${item.salary}` : ''}
            </Text>
            <Text style={[type.xs, { color: c.textSubtle }]}>Saved {timeAgo(item.savedAt)}</Text>
          </Pressable>
          <Pressable
            onPress={() => removeSaved(item.id)}
            style={{ padding: 16 }}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title}`}
          >
            <Text style={[type.sm, { color: c.textMuted }]}>Remove</Text>
          </Pressable>
        </View>
      )}
    />
  );
}
