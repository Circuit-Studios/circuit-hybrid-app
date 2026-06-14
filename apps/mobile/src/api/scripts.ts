import { api, API_BASE_URL } from './client';
import type { ScriptRecord, ScriptAnalysisResponse } from './types';
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

  const res = await fetch(`${API_BASE_URL}/projects/${opts.projectId}/scripts`, {
    method: 'POST',
    headers: {
      // Do NOT set Content-Type — fetch sets the multipart boundary for us.
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: form,
  });

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
