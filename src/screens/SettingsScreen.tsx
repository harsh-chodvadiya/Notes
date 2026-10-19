import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import app from '../../app.json';
import Page from '../components/Page';
import { useThemePref, type ThemePref } from '../settings';
import { COMPOSE, FONT, lift, useTheme } from '../theme';

type Props = { onClose: () => void };

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen({ onClose }: Props) {
  const t = useTheme();
  const [theme, setTheme] = useThemePref();

  return (
    <Page title="Settings" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Theme">
          {THEMES.map(({ value, label }) => {
            const on = theme === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setTheme(value)}
                android_ripple={{ color: t.ripple }}
                style={styles.row}
              >
                <Text style={[styles.label, { color: t.text }]}>{label}</Text>
                <View style={[styles.radio, { borderColor: on ? COMPOSE : t.checkbox }]}>
                  {on && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </Section>

        <Section title="About">
          <View style={styles.row}>
            <Text style={[styles.label, { color: t.text }]}>{app.expo.name}</Text>
            <Text style={[styles.sub, { color: t.subtext }]}>Version {app.expo.version}</Text>
          </View>
        </Section>
      </ScrollView>
    </Page>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: t.subtext }]}>
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: t.card }, lift(t)]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 32 },
  section: { marginTop: 12 },
  sectionTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 'bold', marginLeft: 16, marginBottom: 8 },
  card: { borderRadius: 20, overflow: 'hidden' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, gap: 12 },
  label: { fontFamily: FONT, fontSize: 17 },
  sub: { fontSize: 13, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: COMPOSE },
});
