import { Redirect } from 'expo-router';

/** @deprecated Use AuthScreen at /(auth)/auth */
export default function SignupForm() {
  return <Redirect href="/(auth)/auth" />;
}
