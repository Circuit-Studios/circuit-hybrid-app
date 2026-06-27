import { File, UploadType } from 'expo-file-system';
import { api, API_BASE_URL } from './client';
import type { ScriptRecord, ScriptAnalysisResponse } from './types';
import { logApiRequest, logApiResponse } from '@/lib/logger';
import { readResponseRequestId, withRequestId } from '@/lib/requestId';
import { storage } from '@/lib/storage';

export interface UploadScriptOptions {
  projectId: string;
  fileUri: string;
  fileName: string;
  mimeType?: string;
  onProgress?: (pct: number) => void;
}

// Native multipart upload via expo-file-system — avoids RN 0.85 FormData
// "Unsupported FormDataPart implementation" when appending { uri, name, type }.
export async function uploadScript(opts: UploadScriptOptions): Promise<ScriptRecord> {
  const token = await storage.getToken();
  const url = `${API_BASE_URL}/projects/${opts.projectId}/scripts`;
  const { requestId, headers } = withRequestId({
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
  const startTime = logApiRequest('POST', url, requestId);

  const file = new File(opts.fileUri);
  const result = await file.upload(url, {
    uploadType: UploadType.MULTIPART,
    fieldName: 'script',
    mimeType: opts.mimeType ?? 'application/pdf',
    headers,
    onProgress: opts.onProgress
      ? ({ bytesSent, totalBytes }) => {
          if (totalBytes > 0) {
            opts.onProgress!(Math.round((bytesSent / totalBytes) * 100));
          }
        }
      : undefined,
  });

  logApiResponse(
    'POST',
    url,
    result.status,
    startTime,
    readResponseRequestId(result.headers) ?? requestId,
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status}): ${result.body}`);
  }

  return JSON.parse(result.body) as ScriptRecord;
}

import { registerActiveScriptAnalysis } from '@/auth/activeScriptAnalysis';

export async function triggerAnalysis(scriptId: string): Promise<void> {
  registerActiveScriptAnalysis(scriptId);
  await api.post(`/scripts/${scriptId}/analyze`);
}

export async function getAnalysis(scriptId: string): Promise<ScriptAnalysisResponse> {
  const { data } = await api.get<ScriptAnalysisResponse>(`/scripts/${scriptId}/analysis`);
  return data;
}
