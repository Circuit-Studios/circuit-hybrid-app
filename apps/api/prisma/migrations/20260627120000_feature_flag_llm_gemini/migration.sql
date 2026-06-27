-- Additive feature flag for the optional Gemini LLM provider.
INSERT INTO "feature_flags" ("key", "enabled", "updatedAt") VALUES
  ('llm.gemini', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
