import type { UserRole } from '@/api/types';
import { formatRole } from '@/lib/format';
import { ChipPicker } from '@/components/pickers/ChipPicker';
import { DropdownPicker } from '@/components/pickers/DropdownPicker';

interface RolePickerProps {
  value: UserRole | null;
  onChange(role: UserRole): void;
  /**
   * The PDF spec implies different role buckets between the "I'm starting a
   * project" path (Director/Producer) and the "I was invited" path (everyone
   * else). Pass `signupContext` to filter accordingly.
   */
  signupContext?: 'starter' | 'invitee' | 'all';
  /** Horizontal chips (default) or a tap-to-expand dropdown list. */
  variant?: 'chips' | 'dropdown';
  placeholder?: string;
}

const STARTER_ROLES: UserRole[] = ['DIRECTOR', 'PRODUCER'];
const INVITEE_ROLES: UserRole[] = [
  'EXECUTIVE_PRODUCER',
  'LINE_PRODUCER',
  'AD',
  'DOP',
  'DEPT_HEAD',
  'CREW',
  'ACTOR',
  'VENDOR',
];
const ALL_ROLES: UserRole[] = [...STARTER_ROLES, ...INVITEE_ROLES];

const ROLES_BY_CTX: Record<NonNullable<RolePickerProps['signupContext']>, UserRole[]> = {
  starter: STARTER_ROLES,
  invitee: INVITEE_ROLES,
  all: ALL_ROLES,
};

export function RolePicker({
  value,
  onChange,
  signupContext = 'all',
  variant = 'chips',
  placeholder = 'Select a role',
}: RolePickerProps) {
  const roles = ROLES_BY_CTX[signupContext];
  const options = roles.map(role => ({ value: role, label: formatRole(role) }));

  if (variant === 'dropdown') {
    return (
      <DropdownPicker
        label="Your role"
        placeholder={placeholder}
        options={options}
        value={value}
        onChange={onChange}
        formatDisplayValue={formatRole}
      />
    );
  }

  return (
    <ChipPicker label="Your role" options={options} value={value} onChange={onChange} />
  );
}
