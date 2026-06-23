import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/auth/AuthContext';
import { API_BASE_URL } from '@/api/client';
import { colors, radius, spacing, typography } from '@/theme';
import { formatRole, formatUserInitials, formatUserName } from '@/lib/format';

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  function confirmSignOut() {
    Alert.alert(
      'Sign out',
      'You will need your phone number and password to sign in again on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            void signOut();
          },
        },
      ],
    );
  }

  return (
    <ScreenContainer scroll topAligned edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Account</Text>

      <Card variant="hero" style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user ? formatUserInitials(user) : '?'}</Text>
        </View>
        <Text style={styles.name}>{user ? formatUserName(user) : 'Circuit user'}</Text>
        {user?.phone ? <Text style={styles.meta}>{user.phone}</Text> : null}
        {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
        {user?.defaultRole ? (
          <View style={styles.roleWrap}>
            <StatusBadge label={formatRole(user.defaultRole)} tone="accent" />
          </View>
        ) : null}
      </Card>

      <Text style={styles.sectionLabel}>Session</Text>
      <Card variant="glass">
        <InfoRow label="Signed in as" value={user ? formatUserName(user) : '—'} />
        <View style={styles.divider} />
        <InfoRow
          label="Default role"
          value={user?.defaultRole ? formatRole(user.defaultRole) : '—'}
        />
        <View style={styles.divider} />
        <InfoRow label="API server" value={API_BASE_URL} mono />
      </Card>

      <View style={styles.actions}>
        <PrimaryButton title="Sign out" variant="danger" onPress={confirmSignOut} />
      </View>

      <Text style={styles.footer}>
        Circuit stores your session securely on this device. Sign out before handing the phone to
        someone else on set.
      </Text>
    </ScreenContainer>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.mono]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  back: { ...typography.bodyStrong, color: colors.accent },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.lg },
  profileCard: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...typography.heading, color: colors.accent, fontSize: 24 },
  name: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.xs },
  meta: { ...typography.body, color: colors.textSecondary, marginBottom: 2 },
  roleWrap: { marginTop: spacing.sm },
  sectionLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  infoRow: { paddingVertical: spacing.sm },
  infoLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  infoValue: { ...typography.body, color: colors.textPrimary },
  mono: { fontFamily: 'Menlo', fontSize: 13 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  actions: { marginTop: spacing.xl },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.lg,
    lineHeight: 20,
  },
});
