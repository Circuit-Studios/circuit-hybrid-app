// Minimal Zod -> OpenAI-strict JSON Schema converter.
// We avoid the `zod-to-json-schema` package because OpenAI's "strict" mode
// rejects a few of the features it emits (refs, default, optional without
// `additionalProperties: false`). This implementation covers what our
// `ai/schemas.ts` actually uses.

import { z, type ZodTypeAny, ZodObject, ZodArray, ZodEnum, ZodNativeEnum, ZodNullable, ZodOptional, ZodString, ZodNumber, ZodBoolean, ZodLiteral, ZodUnion } from 'zod';

// The OpenAI SDK accepts `Record<string, unknown>` for `json_schema.schema`.
// We declare an index signature so our typed node is structurally compatible
// without losing the named fields we use internally.
export interface JsonSchemaNode {
  type?: string | string[];
  enum?: unknown[];
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchemaNode;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  description?: string;
  anyOf?: JsonSchemaNode[];
  [extraKey: string]: unknown;
}

export function zodToJsonSchema(schema: ZodTypeAny): JsonSchemaNode {
  return convert(schema);
}

function convert(schema: ZodTypeAny): JsonSchemaNode {
  if (schema instanceof ZodObject) {
    const shape = schema.shape as Record<string, ZodTypeAny>;
    const properties: Record<string, JsonSchemaNode> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convert(value);
      // OpenAI strict mode requires ALL properties to be in `required`.
      // For optional/nullable fields, we still list them as required but
      // their type includes "null".
      required.push(key);
    }
    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    };
  }

  if (schema instanceof ZodArray) {
    return {
      type: 'array',
      items: convert(schema.element),
    };
  }

  if (schema instanceof ZodString) {
    const node: JsonSchemaNode = { type: 'string' };
    const checks = (schema as unknown as { _def: { checks?: Array<{ kind: string; value?: number }> } })._def.checks ?? [];
    for (const check of checks) {
      if (check.kind === 'min' && typeof check.value === 'number') node.minLength = check.value;
      if (check.kind === 'max' && typeof check.value === 'number') node.maxLength = check.value;
    }
    return node;
  }

  if (schema instanceof ZodNumber) {
    const node: JsonSchemaNode = { type: 'number' };
    const checks = (schema as unknown as { _def: { checks?: Array<{ kind: string; value?: number }> } })._def.checks ?? [];
    for (const check of checks) {
      if (check.kind === 'min' && typeof check.value === 'number') node.minimum = check.value;
      if (check.kind === 'max' && typeof check.value === 'number') node.maximum = check.value;
    }
    return node;
  }

  if (schema instanceof ZodBoolean) {
    return { type: 'boolean' };
  }

  if (schema instanceof ZodEnum) {
    return { type: 'string', enum: [...schema.options] };
  }

  if (schema instanceof ZodNativeEnum) {
    const values = Object.values((schema as unknown as { _def: { values: Record<string, string | number> } })._def.values);
    return { type: 'string', enum: values };
  }

  if (schema instanceof ZodLiteral) {
    const value = (schema as unknown as { _def: { value: unknown } })._def.value;
    return { enum: [value] };
  }

  if (schema instanceof ZodNullable) {
    const inner = convert((schema as unknown as { _def: { innerType: ZodTypeAny } })._def.innerType);
    if (Array.isArray(inner.type)) {
      inner.type = [...inner.type, 'null'];
    } else if (typeof inner.type === 'string') {
      inner.type = [inner.type, 'null'];
    } else {
      inner.anyOf = [...(inner.anyOf ?? []), { type: 'null' }];
    }
    return inner;
  }

  if (schema instanceof ZodOptional) {
    // Treat optional as nullable for OpenAI strict mode purposes.
    return convert(z.nullable((schema as unknown as { _def: { innerType: ZodTypeAny } })._def.innerType));
  }

  if (schema instanceof ZodUnion) {
    const options = (schema as unknown as { _def: { options: ZodTypeAny[] } })._def.options;
    return { anyOf: options.map(convert) };
  }

  throw new Error(`Unsupported Zod type: ${schema.constructor.name}`);
}
