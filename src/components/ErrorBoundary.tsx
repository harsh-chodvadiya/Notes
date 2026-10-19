import { Component, type ReactNode } from 'react';
import { Appearance, Pressable, StyleSheet, Text, View } from 'react-native';
import { COMPOSE, FONT } from '../theme';

type State = { error: Error | null };

/**
 * Last-resort catch for render errors: a calm message and a retry instead of a
 * crash. Notes are already saved on the device, so retrying loses nothing.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled render error', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    // Hooks aren't available here, so read the scheme directly.
    const dark = Appearance.getColorScheme() === 'dark';
    return (
      <View style={[styles.root, { backgroundColor: dark ? '#010102' : '#F3F3F5' }]}>
        <Text style={[styles.title, { color: dark ? '#FCFCFF' : '#010102' }]}>Something went wrong</Text>
        <Text style={[styles.body, { color: dark ? '#A3A3A7' : '#848487' }]}>Your notes are safe on this phone.</Text>
        <Pressable accessibilityRole="button" onPress={() => this.setState({ error: null })} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontFamily: FONT, fontSize: 20, fontWeight: 'bold' },
  body: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  button: { marginTop: 28, height: 48, paddingHorizontal: 28, borderRadius: 24, backgroundColor: COMPOSE, justifyContent: 'center' },
  buttonText: { fontFamily: FONT, fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
});
