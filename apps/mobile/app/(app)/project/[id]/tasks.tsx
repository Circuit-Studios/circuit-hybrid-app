import { useLocalSearchParams } from 'expo-router';
import { ProjectScreenScaffold } from '@/components/project/ProjectScreenScaffold';
import { ProjectTasksContent } from '@/features/tasks/ProjectTasksContent';
import { useProjectHealth } from '@/features/tasks/hooks';

export default function TasksScreen() {
  const { id: projectId, dept: deptParam } = useLocalSearchParams<{ id: string; dept?: string }>();
  const pid = projectId ?? '';
  const healthQ = useProjectHealth(pid);

  return (
    <ProjectScreenScaffold
      projectId={pid}
      activeTab="tasks"
      title="Tasks"
      scroll
      backLabel={healthQ.data?.project.name ?? 'Project'}
    >
      <ProjectTasksContent projectId={pid} initialDept={deptParam ?? null} />
    </ProjectScreenScaffold>
  );
}
