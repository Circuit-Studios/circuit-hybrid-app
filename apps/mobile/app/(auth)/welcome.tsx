import { useEffect } from 'react';
import { Redirect } from 'expo-router';

/** Legacy route — forwards to splash → auth flow. */
export default function WelcomeScreen() {
  return <Redirect href="/(auth)/splash" />;
}
