import { useEffect } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useActiveProject } from '@/context/ActiveProjectContext';
import { colors } from '@/theme';

export default function ProjectLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setProjectId } = useActiveProject();

  // Entering a project makes it the active project, so the global Home /
  // Activity / Schedule / Team tabs reflect the film you're working in.
  useEffect(() => {
    if (id) setProjectId(id);
  }, [id, setProjectId]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
