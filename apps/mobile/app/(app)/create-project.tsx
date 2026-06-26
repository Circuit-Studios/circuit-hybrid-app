import { useRouter } from 'expo-router';
import { CreateProjectSheet } from '@/features/projects/CreateProjectSheet';

export default function CreateProjectScreen() {
  const router = useRouter();

  return (
    <CreateProjectSheet
      onClose={() => router.back()}
      onCreated={(projectId) => router.replace(`/(app)/project/${projectId}/upload-script`)}
    />
  );
}
