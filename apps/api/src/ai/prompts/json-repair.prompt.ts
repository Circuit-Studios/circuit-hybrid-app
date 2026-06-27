export const JSON_REPAIR_SYSTEM_PROMPT =
  'You repair malformed JSON. Return only valid JSON matching the requested schema. No markdown fences.';

export function buildJsonRepairUserPrompt(schemaName: string, invalidContent: string): string {
  return [
    `The previous response for schema "${schemaName}" was invalid.`,
    'Return corrected JSON only.',
    'Invalid content (truncated):',
    invalidContent.slice(0, 2000),
  ].join('\n');
}
