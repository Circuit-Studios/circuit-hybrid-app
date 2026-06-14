import { Text, View } from 'react-native';
import { FormErrorText } from '@/components/FormErrorText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { authFormStyles } from '@/theme';

interface AuthFormActionsProps {
  error: string | null;
  submitHint: string | null;
  submitTitle: string;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
  footer?: React.ReactNode;
}

export function AuthFormActions({
  error,
  submitHint,
  submitTitle,
  canSubmit,
  submitting,
  onSubmit,
  onBack,
  footer,
}: AuthFormActionsProps) {
  return (
    <>
      {error ? <FormErrorText>{error}</FormErrorText> : null}
      <View style={authFormStyles.actions}>
        {submitHint ? <Text style={authFormStyles.submitHint}>{submitHint}</Text> : null}
        <PrimaryButton
          title={submitTitle}
          disabled={!canSubmit}
          loading={submitting}
          onPress={onSubmit}
        />
        <PrimaryButton title="Back" variant="ghost" onPress={onBack} />
        {footer}
      </View>
    </>
  );
}
