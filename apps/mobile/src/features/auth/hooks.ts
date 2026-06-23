import { useCallback, useState } from 'react';
import { readApiError } from '@/api/client';

interface UseAuthSubmitOptions {
  canSubmit: boolean;
  submit: () => Promise<void>;
  fallbackError: string;
}

export function useAuthSubmit({ canSubmit, submit, fallbackError }: UseAuthSubmitOptions) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await submit();
    } catch (err) {
      setError(readApiError(err, fallbackError));
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, fallbackError, submit]);

  const clearFeedback = useCallback(() => {
    setError(null);
    setSubmitting(false);
  }, []);

  return { submitting, error, handleSubmit, clearFeedback };
}
