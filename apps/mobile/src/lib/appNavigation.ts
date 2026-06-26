import type { Href } from 'expo-router';
import { router } from 'expo-router';

type AppRouter = typeof router;

const HOME_TABS: Href = '/(app)/(tabs)/home';

/** Leave a stack overlay (account, notifications) and return to tabs safely. */
export function leaveOverlayScreen(appRouter: AppRouter, fallback: Href = HOME_TABS) {
  if (appRouter.canGoBack()) {
    appRouter.back();
    return;
  }
  appRouter.replace(fallback);
}

/** Leave the projects list — always return to home tabs (avoids duplicate /projects stack entries). */
export function leaveProjectsScreen(appRouter: AppRouter) {
  appRouter.replace(HOME_TABS);
}

/** Leave a project workspace screen — pop when possible instead of pushing another /projects route. */
export function leaveProjectWorkspace(appRouter: AppRouter) {
  if (appRouter.canGoBack()) {
    appRouter.back();
    return;
  }
  appRouter.replace('/(app)/projects');
}

/** Leave upload-script — pop to prior screen (workspace or projects) or open workspace. */
export function leaveUploadScript(appRouter: AppRouter, projectId: string) {
  if (appRouter.canGoBack()) {
    appRouter.back();
    return;
  }
  appRouter.replace(`/(app)/project/${projectId}`);
}
