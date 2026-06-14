import type { ViewStyle } from 'react-native';
import { LabeledInput } from '@/components/LabeledInput';

interface PasswordFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  mode?: 'login' | 'new';
  containerStyle?: ViewStyle;
}

export function PasswordField({
  value,
  onChangeText,
  mode = 'login',
  containerStyle,
}: PasswordFieldProps) {
  const isNew = mode === 'new';

  return (
    <LabeledInput
      label="Password"
      placeholder={isNew ? 'At least 8 characters' : 'Enter your password'}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry
      autoCapitalize="none"
      autoComplete={isNew ? 'new-password' : 'password'}
      textContentType={isNew ? 'newPassword' : 'password'}
      containerStyle={containerStyle}
    />
  );
}
