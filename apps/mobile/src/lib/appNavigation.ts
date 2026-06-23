import type { Href } from 'expo-router';
import { router } from 'expo-router';

type AppRouter = typeof router;

/** Leave a stack overlay (account, notifications) and return to tabs safely. */
export function leaveOverlayScreen(
  appRouter: AppRouter,
  fallback: Href = '/(app)/(tabs)/home',
) {
  if (appRouter.canGoBack()) {
    appRouter.back();
    return;
  }
  appRouter.replace(fallback);
}
