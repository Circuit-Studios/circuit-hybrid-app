import { useChromeInsets } from '@/hooks/useChromeInsets';

export type FloatingTabBarReserveMode = boolean | 'app' | 'project' | 'auto';

/**
 * Bottom inset so scroll content clears the global floating tab bar. There is a
 * single shared tab bar app-wide, so every mode (other than `false`) reserves
 * the same space.
 */
export function useFloatingTabBarReserve(mode: FloatingTabBarReserveMode = 'auto'): number {
  const { appTabBarReserve } = useChromeInsets();

  if (mode === false) return 0;
  return appTabBarReserve;
}
