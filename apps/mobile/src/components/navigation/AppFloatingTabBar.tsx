import { AppTabBar } from '@/components/AppTabBar';

/**
 * Global floating tab bar. The app runs in a single-active-project model, so
 * the same Home / Tasks / Schedule / Team bar is shown on every screen.
 */
export function AppFloatingTabBar() {
  return <AppTabBar />;
}
