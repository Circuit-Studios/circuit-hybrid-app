import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { leaveOverlayScreen } from '@/lib/appNavigation';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/auth/AuthContext';
import { API_BASE_URL, readApiError } from '@/api/client';
import { appConfig } from '@/config/appEnv';
import { colors, radius, spacing, typography } from '@/theme';
import { formatRole, formatUserInitials, formatUserName } from '@/lib/format';

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  function confirmSignOut() {
    Alert.alert(
      'Sign out',
      'You will need your email and password to sign in again on this device.',
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

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently removes your Circuit account, memberships, and notifications. Projects you own must be deleted first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void handleDeleteAccount();
          },
        },
      ],
    );
  }

  function showLegalPlaceholder(title: string) {
    Alert.alert(title, 'The legal page will be linked here in a future release.');
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      Alert.alert('Could not delete account', readApiError(err, 'Try again later.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScreenContainer scroll topAligned edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => leaveOverlayScreen(router)}
          hitSlop={12}
          accessibilityRole="button"
        >
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
      </Card>

      <Text style={styles.sectionLabel}>Legal</Text>
      <Card variant="glass">
        <ActionRow label="Privacy Policy" onPress={() => showLegalPlaceholder('Privacy Policy')} />
        <View style={styles.divider} />
        <ActionRow
          label="Terms of Service"
          onPress={() => showLegalPlaceholder('Terms of Service')}
        />
      </Card>

      {!appConfig.isProduction ? (
        <>
          <Text style={styles.sectionLabel}>Developer diagnostics</Text>
          <Card variant="glass">
            <InfoRow label="App environment" value={appConfig.appEnv} mono />
            <View style={styles.divider} />
            <InfoRow label="API server" value={API_BASE_URL} mono />
          </Card>
        </>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton title="Sign out" variant="danger" onPress={confirmSignOut} />
        <PrimaryButton
          title="Delete account"
          variant="danger"
          loading={deleting}
          onPress={confirmDeleteAccount}
        />
      </View>

      <Text style={styles.footer}>
        Circuit stores your session securely on this device. Sign out before handing the phone to
        someone else on set. Deleting your account is permanent.
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

function ActionRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
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
    marginTop: spacing.md,
  },
  infoRow: { paddingVertical: spacing.sm },
  infoLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  infoValue: { ...typography.body, color: colors.textPrimary },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  actionRowPressed: { opacity: 0.85 },
  actionLabel: { ...typography.body, color: colors.textPrimary },
  actionChevron: { ...typography.bodyStrong, color: colors.textMuted },
  mono: { fontFamily: 'Menlo', fontSize: 13 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.lg,
    lineHeight: 20,
  },
});
