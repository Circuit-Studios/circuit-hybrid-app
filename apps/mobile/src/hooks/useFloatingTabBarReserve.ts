import { usePathname } from 'expo-router';
import { useChromeInsets } from '@/hooks/useChromeInsets';

export type FloatingTabBarReserveMode = boolean | 'app' | 'project' | 'auto';

/** Bottom inset so scroll content clears the global floating tab bar. */
export function useFloatingTabBarReserve(mode: FloatingTabBarReserveMode = 'auto'): number {
  const pathname = usePathname();
  const { appTabBarReserve, projectTabBarReserve } = useChromeInsets();

  if (mode === false) return 0;
  if (mode === 'app') return appTabBarReserve;
  if (mode === 'project') return projectTabBarReserve;

  if (mode === 'auto' && pathname.includes('/project/')) {
    return projectTabBarReserve;
  }

  return appTabBarReserve;
}
