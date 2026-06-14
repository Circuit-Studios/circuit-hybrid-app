import { useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { authFormStyles } from '@/theme';

interface AuthSwitchLinkProps {
  prompt: string;
  linkLabel: string;
  href: Href;
  replace?: boolean;
}

export function AuthSwitchLink({ prompt, linkLabel, href, replace }: AuthSwitchLinkProps) {
  const router = useRouter();

  function navigate() {
    if (replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  }

  return (
    <View style={authFormStyles.footer}>
      <Text style={authFormStyles.footerText}>{prompt}</Text>
      <Pressable onPress={navigate} hitSlop={8}>
        <Text style={authFormStyles.footerLink}>{linkLabel}</Text>
      </Pressable>
    </View>
  );
}
