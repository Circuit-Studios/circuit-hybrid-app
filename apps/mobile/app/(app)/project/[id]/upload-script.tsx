import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FormErrorText } from '@/components/FormErrorText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { colors, radius, spacing, typography } from '@/theme';
import { uploadScript, triggerAnalysis } from '@/api/scripts';
import { readApiError } from '@/api/client';
import { leaveUploadScript } from '@/lib/appNavigation';
import { useAppConfig } from '@/config/AppConfigContext';

interface PickedFile {
  uri: string;
  name: string;
  size: number | undefined;
  mimeType: string | undefined;
}

export default function UploadScriptScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFeatureEnabled } = useAppConfig();
  const uploadEnabled = isFeatureEnabled('scripts.upload');
  const analysisEnabled = isFeatureEnabled('scripts.aiAnalysis');

  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      // Enforce the same 25MB cap that the backend enforces — fail early so
      // we don't waste cellular bandwidth on a rejected upload.
      if (asset.size && asset.size > 25 * 1024 * 1024) {
        setError('That PDF is over 25MB. Please upload a smaller draft.');
        return;
      }
      setPicked({
        uri: asset.uri,
        name: asset.name,
        size: asset.size,
        mimeType: asset.mimeType,
      });
    } catch (err) {
      setError(readApiError(err, 'Could not open the file picker'));
    }
  }

  async function handleUpload() {
    if (!picked || !projectId || !uploadEnabled) return;
    setUploading(true);
    setError(null);
    try {
      const script = await uploadScript({
        projectId,
        fileUri: picked.uri,
        fileName: picked.name,
        mimeType: picked.mimeType ?? 'application/pdf',
      });
      if (analysisEnabled) {
        await triggerAnalysis(script.id);
        router.replace(`/(app)/project/${projectId}/ai-progress?scriptId=${script.id}`);
      } else {
        router.replace(`/(app)/project/${projectId}`);
      }
    } catch (err) {
      setError(readApiError(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <Pressable onPress={() => leaveUploadScript(router, projectId!)} hitSlop={12}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>Upload your script</Text>
      <Text style={styles.body}>
        We accept clean PDFs up to 25MB. Final-draft or screenplay-style formatting works best. Once
        uploaded, our AI maps characters, scenes, departments, shoot days and a budget draft.
      </Text>

      {!uploadEnabled ? (
        <Text style={styles.disabledNotice}>Script upload is temporarily disabled.</Text>
      ) : null}

      {picked ? (
        <Card style={styles.fileCard}>
          <Text style={styles.fileName} numberOfLines={2}>
            {picked.name}
          </Text>
          {picked.size ? (
            <Text style={styles.fileMeta}>{(picked.size / (1024 * 1024)).toFixed(1)} MB · PDF</Text>
          ) : (
            <Text style={styles.fileMeta}>PDF</Text>
          )}
          <Pressable onPress={handlePick} disabled={uploading} hitSlop={8}>
            <Text style={styles.changeLink}>Choose a different file</Text>
          </Pressable>
        </Card>
      ) : (
        <Pressable onPress={handlePick} accessibilityRole="button" style={styles.dropzone}>
          <Text style={styles.dropzoneIcon}>↑</Text>
          <Text style={styles.dropzoneTitle}>Tap to choose a PDF</Text>
          <Text style={styles.dropzoneSub}>Up to 25MB</Text>
        </Pressable>
      )}

      {error ? <FormErrorText>{error}</FormErrorText> : null}

      <View style={styles.actions}>
        <PrimaryButton
          title={uploading ? 'Uploading & queuing AI…' : 'Upload & analyse'}
          loading={uploading}
          disabled={!picked || !uploadEnabled}
          onPress={handleUpload}
        />
        <PrimaryButton
          title="Skip for now"
          variant="ghost"
          onPress={() => leaveUploadScript(router, projectId!)}
        />
      </View>

      <Card style={styles.tipCard}>
        <Text style={styles.tipTitle}>What you'll get</Text>
        <Text style={styles.tipItem}>· Cast list with importance + estimated screen time</Text>
        <Text style={styles.tipItem}>· Scene breakdown with INT/EXT, day/night, locations</Text>
        <Text style={styles.tipItem}>· Combination scenes — scenes to shoot together</Text>
        <Text style={styles.tipItem}>· Departments your story actually needs</Text>
        <Text style={styles.tipItem}>· Shoot-day estimate per actor</Text>
        <Text style={styles.tipItem}>· Draft budget by department in ₹ INR</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { ...typography.bodyStrong, color: colors.textSecondary, marginBottom: spacing.md },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
  disabledNotice: { ...typography.bodyStrong, color: colors.danger, marginBottom: spacing.md },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  dropzoneIcon: {
    fontSize: 38,
    color: colors.accent,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  dropzoneTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: 4 },
  dropzoneSub: { ...typography.caption, color: colors.textMuted },
  fileCard: { gap: spacing.xs },
  fileName: { ...typography.heading, color: colors.textPrimary },
  fileMeta: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  changeLink: { ...typography.bodyStrong, color: colors.accent },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  tipCard: { marginTop: spacing.xl, gap: spacing.xs },
  tipTitle: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  tipItem: { ...typography.body, color: colors.textSecondary },
});
