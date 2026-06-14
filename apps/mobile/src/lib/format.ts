// Locale-aware formatters shared across screens.

export function formatCurrencyINR(amount: number | null | undefined): string {
  if (amount == null) return '—';
  // Crore-aware shorthand for big numbers (typical Telugu/Hindi cinema budgets).
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) {
    return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  }
  if (abs >= 100_000) {
    return `₹${(amount / 100_000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

import type { ProjectLanguage } from '@/api/types';

const LANGUAGE_LABELS: Record<ProjectLanguage, string> = {
  TELUGU: 'Telugu',
  HINDI: 'Hindi',
  TAMIL: 'Tamil',
  MALAYALAM: 'Malayalam',
  KANNADA: 'Kannada',
  ENGLISH: 'English',
  OTHER: 'Other',
};

export function formatLanguage(lang: ProjectLanguage): string {
  return LANGUAGE_LABELS[lang] ?? lang;
}

export function formatLanguages(langs: ProjectLanguage[]): string {
  if (langs.length === 0) return '—';
  return langs.map(formatLanguage).join(', ');
}

/** Prefer `languages[]`; fall back to legacy single `language` on older rows. */
export function formatProjectLanguages(project: {
  language: ProjectLanguage;
  languages?: ProjectLanguage[];
}): string {
  const langs = project.languages?.length ? project.languages : [project.language];
  return formatLanguages(langs);
}

export function formatRole(role: string): string {
  return role
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function formatUserName(user: { firstName: string; lastName: string }): string {
  return [user.firstName.trim(), user.lastName.trim()].filter(Boolean).join(' ') || 'Circuit user';
}

export function formatUserInitials(user: { firstName: string; lastName: string }): string {
  const first = user.firstName.trim();
  const last = user.lastName.trim();
  if (!first && !last) return '?';
  if (!last) return first.slice(0, 2).toUpperCase();
  return (first[0]! + last[0]!).toUpperCase();
}

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function relativeTimeFrom(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
