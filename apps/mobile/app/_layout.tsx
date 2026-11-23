import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const { c, scheme } = useTheme();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5 * 60_000, gcTime: 30 * 60_000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.surface },
            headerTintColor: c.accent,
            headerTitleStyle: { color: c.text, fontWeight: '600' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.bg },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="job/[id]" options={{ title: '' }} />
          <Stack.Screen name="list" options={{ title: 'Jobs' }} />
          <Stack.Screen name="companies" options={{ title: 'Companies' }} />
          <Stack.Screen name="funded" options={{ title: 'Recently funded' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
