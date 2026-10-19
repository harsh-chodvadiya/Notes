import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import { TooltipProvider } from './src/components/Tooltip';
import NotesScreen from './src/screens/NotesScreen';
import { forgetOldPin } from './src/lock';
import { applyThemePref, getThemePref } from './src/settings';
import { StoreProvider } from './src/store';
import { useTheme } from './src/theme';

// Before the first render, so the saved theme shows from the first frame.
applyThemePref(getThemePref());
// The app's own PIN was replaced by the phone's screen lock; drop what it stored.
forgetOldPin();

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <TooltipProvider>
          <StoreProvider>
            <Root />
          </StoreProvider>
        </TooltipProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function Root() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <NotesScreen />
    </View>
  );
}
