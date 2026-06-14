import type { ProjectLanguage } from '@/api/types';
import { formatLanguage, formatLanguages } from '@/lib/format';
import { ChipPicker } from '@/components/pickers/ChipPicker';
import { DropdownPicker } from '@/components/pickers/DropdownPicker';

const LANGS: { id: ProjectLanguage; label: string }[] = [
  { id: 'TELUGU', label: 'Telugu' },
  { id: 'HINDI', label: 'Hindi' },
  { id: 'TAMIL', label: 'Tamil' },
  { id: 'MALAYALAM', label: 'Malayalam' },
  { id: 'KANNADA', label: 'Kannada' },
  { id: 'ENGLISH', label: 'English' },
  { id: 'OTHER', label: 'Other' },
];

const LANGUAGE_OPTIONS = LANGS.map(({ id, label }) => ({ value: id, label }));

type LanguagePickerBase = {
  variant?: 'chips' | 'dropdown';
  placeholder?: string;
};

export type LanguagePickerProps = LanguagePickerBase &
  (
    | {
        multiple: true;
        value: ProjectLanguage[];
        onChange: (langs: ProjectLanguage[]) => void;
      }
    | {
        multiple?: false;
        value: ProjectLanguage | null;
        onChange: (lang: ProjectLanguage) => void;
      }
  );

export function LanguagePicker(props: LanguagePickerProps) {
  const {
    variant = 'chips',
    placeholder = 'Select a Language',
    multiple = false,
  } = props;

  if (variant === 'dropdown' && props.multiple) {
    return (
      <DropdownPicker
        multiple
        label="Languages"
        hint="Tap to select one or more. First selected is the primary."
        placeholder={placeholder}
        options={LANGUAGE_OPTIONS}
        value={props.value}
        onChange={props.onChange}
        formatDisplayValue={formatLanguages}
      />
    );
  }

  if (variant === 'dropdown' && !props.multiple) {
    return (
      <DropdownPicker
        label="Language"
        placeholder={placeholder}
        options={LANGUAGE_OPTIONS}
        value={props.value}
        onChange={props.onChange}
        formatDisplayValue={formatLanguage}
      />
    );
  }

  if (!props.multiple) {
    return (
      <ChipPicker
        label="Language"
        options={LANGUAGE_OPTIONS}
        value={props.value}
        onChange={props.onChange}
      />
    );
  }

  return null;
}
