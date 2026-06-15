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

// Uses FormData directly because the backend's `multer` middleware reads
// `multipart/form-data` with a `script` field. We bypass axios for upload
// because RN's FormData support behind axios has historically been flaky for
// large binaries — `fetch` is the safest path here.
export async function uploadScript(opts: UploadScriptOptions): Promise<ScriptRecord> {
  const token = await storage.getToken();
  const form = new FormData();
  // React Native's File-like blob shape for FormData.
  form.append('script', {
    uri: opts.fileUri,
    name: opts.fileName,
    type: opts.mimeType ?? 'application/pdf',
  } as unknown as Blob);

  const url = `${API_BASE_URL}/projects/${opts.projectId}/scripts`;
  const { requestId, headers } = withRequestId({
    Authorization: token ? `Bearer ${token}` : '',
  });
  const startTime = logApiRequest('POST', url, requestId);

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: form,
  });

  logApiResponse(
    'POST',
    url,
    res.status,
    startTime,
    readResponseRequestId(Object.fromEntries(res.headers.entries())) ?? requestId,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<ScriptRecord>;
}

export async function triggerAnalysis(scriptId: string): Promise<void> {
  await api.post(`/scripts/${scriptId}/analyze`);
}

export async function getAnalysis(scriptId: string): Promise<ScriptAnalysisResponse> {
  const { data } = await api.get<ScriptAnalysisResponse>(`/scripts/${scriptId}/analysis`);
  return data;
}
