import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import type { CountryCode } from 'libphonenumber-js';
import { colors, radius, typography } from '@/theme';

/**
 * iOS ships color emoji including regional-indicator flags, so emoji is the
 * fastest, network-free path on iPhone. Android's stock fonts often render
 * the same regional indicators as letters (IN, US, ...), so we serve a PNG
 * from flagcdn.com there. If both fail we show the ISO code as a chip.
 */
function emojiFlag(code: CountryCode): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function flagUri(code: CountryCode): string {
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}

interface CountryFlagProps {
  code: CountryCode;
  size?: number;
}

export function CountryFlag({ code, size = 20 }: CountryFlagProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const width = Math.round(size * 1.4);
  const height = Math.round(size * 0.95);

  // iOS — native color emoji.
  if (Platform.OS === 'ios') {
    return (
      <Text
        style={[styles.emoji, { fontSize: size + 2, lineHeight: size + 4 }]}
        accessibilityLabel={`${code} flag`}
      >
        {emojiFlag(code)}
      </Text>
    );
  }

  // Android — PNG image with text-chip fallback if offline.
  if (!imageFailed) {
    return (
      <Image
        source={{ uri: flagUri(code) }}
        style={{ width, height, borderRadius: radius.sm }}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
        accessibilityIgnoresInvertColors
        accessibilityLabel={`${code} flag`}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width, height }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.42 }]}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: {
    textAlign: 'center',
  },
  fallback: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    ...typography.micro,
    color: colors.textSecondary,
    letterSpacing: 0,
    textTransform: 'none',
    fontWeight: '700',
  },
});
