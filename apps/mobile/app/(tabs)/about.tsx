import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, Text } from 'react-native';
import { API_URL } from '@/api';
import { Button } from '@/components/ui';
import { type, useTheme } from '@/theme';

export default function AboutScreen() {
  const { c } = useTheme();
  const p = [type.base, { color: c.text }];
  const h = [type.md, { color: c.text, fontWeight: '600' as const, marginTop: 8 }];
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
    >
      <Text style={p}>
        RoleUp lists tech jobs you can apply to from India: on-site and hybrid roles in Indian
        cities, and remote roles open to India. Jobs come straight from company job boards
        (Greenhouse, Lever, Ashby) and are refreshed every 6 hours.
      </Text>
      <Text style={h}>Labels</Text>
      <Text style={p}>
        Remote (India OK) means the posting names India, an Indian city or APAC. Remote (Global)
        means anywhere. Restricted means only other regions. Salaries are shown only when the
        employer posts them.
      </Text>
      <Text style={h}>Privacy</Text>
      <Text style={p}>
        No account. Saved jobs and recent filters stay on this phone. Resumes you check are
        processed in memory and never stored. No analytics.
      </Text>
      <Button
        label="Privacy policy"
        onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacy`)}
      />
      <Button label="Terms" onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/terms`)} />
      <Text style={[type.xs, { color: c.textSubtle, marginTop: 16 }]}>
        Version {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </ScrollView>
  );
}
