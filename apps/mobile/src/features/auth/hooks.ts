import { useCallback, useEffect, useRef, useState } from 'react';
import { readApiError } from '@/api/client';

interface UseAuthSubmitOptions {
  canSubmit: boolean;
  phoneE164: string | null;
  submit: () => Promise<void>;
  fallbackError: string;
}

export function useAuthSubmit({
  canSubmit,
  phoneE164,
  submit,
  fallbackError,
}: UseAuthSubmitOptions) {
  const submitRef = useRef(submit);
  submitRef.current = submit;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneError, setShowPhoneError] = useState(false);

  useEffect(() => {
    if (phoneE164 && showPhoneError) {
      setShowPhoneError(false);
    }
  }, [phoneE164, showPhoneError]);

  const handleSubmit = useCallback(async () => {
    if (!phoneE164) {
      setShowPhoneError(true);
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await submitRef.current();
    } catch (err) {
      setError(readApiError(err, fallbackError));
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, fallbackError, phoneE164]);

  return { submitting, error, showPhoneError, handleSubmit };
}
