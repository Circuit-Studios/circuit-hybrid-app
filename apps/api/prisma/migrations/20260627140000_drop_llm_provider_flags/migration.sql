-- LLM provider selection is now env-only (LLM_PROVIDER + LLM_PROVIDER_* overrides).
-- Remove the redundant provider feature flags so there is a single source of truth.
DELETE FROM "feature_flags" WHERE "key" IN ('llm.nvidia', 'llm.gemini');
