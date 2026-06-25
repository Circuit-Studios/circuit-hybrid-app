import type { ViewStyle } from 'react-native';
import { LabeledInput } from '@/components/LabeledInput';
import type { AuthFieldVariant } from '@/theme/fields';

interface PasswordFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  mode?: 'login' | 'new';
  hint?: string;
  containerStyle?: ViewStyle;
  fieldVariant?: AuthFieldVariant;
}

export function PasswordField({
  value,
  onChangeText,
  mode = 'login',
  hint,
  containerStyle,
  fieldVariant = 'signIn',
}: PasswordFieldProps) {
  const isNew = mode === 'new';
  const placeholder =
    fieldVariant === 'signUp' && isNew
      ? 'Password'
      : isNew
        ? 'At least 8 characters'
        : 'Enter your password';

  return (
    <LabeledInput
      label="Password"
      leadingIcon="lock-closed-outline"
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry
      autoCapitalize="none"
      autoComplete={isNew ? 'new-password' : 'password'}
      textContentType={isNew ? 'newPassword' : 'password'}
      hint={hint}
      containerStyle={containerStyle}
      fieldVariant={fieldVariant}
    />
  );
}
