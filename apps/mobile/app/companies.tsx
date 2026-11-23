import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { api } from '@/api';
import { CompanyLogo, Empty, Button } from '@/components/ui';
import { tabular, type, useTheme } from '@/theme';

export default function CompaniesScreen() {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['companies'], queryFn: ({ signal }) => api.companies(signal) });
  if (q.isPending) return <ActivityIndicator style={{ marginTop: 32 }} color={c.textSubtle} />;
  if (q.isError)
    return (
      <Empty
        title="Couldn't load companies"
        detail={q.error.message}
        action={<Button label="Try again" onPress={() => void q.refetch()} />}
      />
    );
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      data={q.data.items}
      keyExtractor={(x) => String(x.id)}
      getItemLayout={(_, index) => ({ length: 60, offset: 60 * index, index })}
      initialNumToRender={15}
      windowSize={7}
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/list', params: { title: item.name, company: item.slug } })
          }
          style={({ pressed }) => ({
            height: 60,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
            backgroundColor: pressed ? c.surfaceMuted : c.surface,
          })}
        >
          <CompanyLogo name={item.name} domain={item.domain} logoUrl={item.logoUrl} />
          <View style={{ flex: 1 }}>
            <Text style={[type.base, { color: c.text, fontWeight: '500' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[type.xs, tabular, { color: c.textSubtle }]}>
              {item.openJobsCount} open jobs{item.ycBatch ? ` · YC ${item.ycBatch}` : ''}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}
