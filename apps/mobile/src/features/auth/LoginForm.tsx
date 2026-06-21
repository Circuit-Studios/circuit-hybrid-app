import { Redirect } from 'expo-router';

/** @deprecated Use AuthScreen at /(auth)/auth */
export default function LoginForm() {
  return <Redirect href="/(auth)/auth" />;
}
