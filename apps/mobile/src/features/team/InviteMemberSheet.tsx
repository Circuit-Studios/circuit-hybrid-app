import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LabeledInput } from '@/components/LabeledInput';
import { PhoneField, usePhoneFieldState } from '@/components/PhoneField';
import { RolePicker } from '@/components/RolePicker';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  FormSheet,
  FormSheetActions,
  FormSheetError,
  FormSheetIntro,
} from '@/components/ui/FormSheet';
import { inviteMember } from '@/api/members';
import { useAppConfig } from '@/config/AppConfigContext';
import { qk } from '@/api/queryKeys';
import { readApiError } from '@/api/client';
import { getDefaultCountry } from '@/lib/phone';
import type { UserRole } from '@/api/types';

export interface InviteMemberSheetProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
}

export function InviteMemberSheet({ visible, onClose, projectId }: InviteMemberSheetProps) {
  const qc = useQueryClient();
  const { isFeatureEnabled } = useAppConfig();
  const invitesEnabled = isFeatureEnabled('team.invites');
  const [name, setName] = useState('');
  const phoneField = usePhoneFieldState();
  const [role, setRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName('');
    phoneField.setCountry(getDefaultCountry());
    phoneField.setNationalNumber('');
    setRole(null);
    setError(null);
  }, [visible]);

  const mutation = useMutation({
    mutationFn: () =>
      inviteMember(projectId, {
        role: role!,
        name: name.trim() || undefined,
        phone: phoneField.e164!,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.members(projectId) });
      onClose();
    },
  });

  async function submit() {
    if (!invitesEnabled) {
      setError('Team invites are temporarily disabled.');
      return;
    }
    setError(null);
    if (!phoneField.e164) {
      setError(phoneField.error ?? 'Enter a valid mobile number.');
      return;
    }
    if (!role) {
      setError('Pick a role.');
      return;
    }
    try {
      await mutation.mutateAsync();
    } catch (err) {
      setError(readApiError(err, 'Could not send invite'));
    }
  }

  return (
    <FormSheet visible={visible} title="Invite a teammate" onClose={onClose}>
      <FormSheetIntro>
        They'll get a Circuit invite for this project. If they're already a Circuit user, it shows
        up in their projects list. Otherwise, signing up with this phone number auto-links them.
      </FormSheetIntro>

      {!invitesEnabled ? (
        <FormSheetError>Team invites are temporarily disabled.</FormSheetError>
      ) : null}

      <LabeledInput
        label="Name (optional)"
        placeholder="e.g. Priya Menon"
        autoCapitalize="words"
        value={name}
        onChangeText={setName}
      />
      <PhoneField
        country={phoneField.country}
        nationalNumber={phoneField.nationalNumber}
        onCountryChange={phoneField.setCountry}
        onNationalNumberChange={phoneField.setNationalNumber}
        showError={!!error && !phoneField.isValid}
      />
      <RolePicker value={role} onChange={setRole} signupContext="invitee" variant="dropdown" />

      {error ? <FormSheetError>{error}</FormSheetError> : null}

      <FormSheetActions>
        <PrimaryButton
          title="Send invite"
          loading={mutation.isPending}
          onPress={submit}
          disabled={!invitesEnabled}
        />
      </FormSheetActions>
    </FormSheet>
  );
}
