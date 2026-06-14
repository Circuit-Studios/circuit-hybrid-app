/** Format a user's display name from first + last name fields. */
export function formatUserName(user: { firstName: string; lastName: string }): string {
  return [user.firstName.trim(), user.lastName.trim()].filter(Boolean).join(' ');
}
