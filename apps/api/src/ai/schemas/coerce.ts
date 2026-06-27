import { z, type ZodType, type ZodTypeAny, type ZodTypeDef } from 'zod';

/**
 * Tolerant coercion helpers for LLM JSON output.
 *
 * NVIDIA/Nemotron models routinely omit empty arrays, return `null` instead of
 * `[]`, emit numbers where strings are expected, or include over-length items.
 * Rather than failing a whole batch on a single malformed field, these helpers
 * coerce values into clean shapes and drop anything unusable.
 */

/** Array of trimmed, length-capped, non-empty strings. Missing/invalid → `[]`. */
export function tolerantStringList(maxItems: number, itemMax = 200) {
  return z.preprocess((value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => (typeof item === 'string' ? item : item == null ? '' : String(item)))
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => item.slice(0, itemMax))
      .slice(0, maxItems);
  }, z.array(z.string()));
}

/** Non-empty string capped at `max`; missing/blank → `null`. */
export function tolerantNullableText(max: number) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() ? value.slice(0, max) : null),
    z.string().nullable(),
  );
}

/** Required string with coercion; missing → `''` (caller can filter junk rows). */
export function tolerantString(max: number) {
  return z.preprocess((value) => (value == null ? '' : String(value).slice(0, max)), z.string());
}

/** Number clamped to `[min, max]`; non-numeric → `fallback`. */
export function tolerantNumber(min: number, max: number, fallback: number) {
  return z.preprocess((value) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }, z.number());
}

/** Integer clamped to `[min, max]`; non-numeric → `fallback`. */
export function tolerantInt(min: number, max: number, fallback: number) {
  return z.preprocess((value) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }, z.number().int());
}

/** Enum that falls back to `fallback` for unknown/missing values. */
export function tolerantEnum<T extends [string, ...string[]]>(
  values: T,
  fallback: T[number],
): ZodTypeAny {
  return z.enum(values).catch(fallback);
}

/**
 * Array of objects where each element is parsed independently. Elements that
 * fail validation are dropped rather than failing the whole array, so one
 * malformed item from the LLM never discards an entire batch.
 */
export function tolerantObjectArray<T>(itemSchema: ZodType<T, ZodTypeDef, any>, maxItems: number) {
  return z.preprocess((value) => {
    if (!Array.isArray(value)) return [];
    const kept: unknown[] = [];
    for (const item of value) {
      if (kept.length >= maxItems) break;
      if (itemSchema.safeParse(item).success) kept.push(item);
    }
    return kept;
  }, z.array(itemSchema).max(maxItems));
}
