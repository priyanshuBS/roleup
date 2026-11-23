import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '@/theme';

/** Five tabs. Text labels only (no icon font) to keep the bundle and cold start small. */
export default function TabsLayout() {
  const { c } = useTheme();
  const label = (title: string) =>
    function TabLabel({ focused }: { focused: boolean }) {
      return (
        <Text
          style={{
            fontSize: 12,
            fontWeight: focused ? '600' : '400',
            color: focused ? c.accent : c.textMuted,
          }}
        >
          {title}
        </Text>
      );
    };
  return (
    <Tabs
      screenOptions={{
        lazy: true,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarItemStyle: { justifyContent: 'center' },
        headerStyle: { backgroundColor: c.surface },
        headerTitleStyle: { color: c.text, fontWeight: '600' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Latest jobs', tabBarLabel: label('Latest') }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarLabel: label('Explore') }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarLabel: label('Saved') }} />
      <Tabs.Screen
        name="ats"
        options={{ title: 'ATS resume check', tabBarLabel: label('ATS Check') }}
      />
      <Tabs.Screen name="about" options={{ title: 'About', tabBarLabel: label('About') }} />
    </Tabs>
  );
}
