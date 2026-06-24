-- Additive feature flags for shooting plan / NVIDIA LLM pipeline.
INSERT INTO "feature_flags" ("key", "enabled", "updatedAt") VALUES
  ('scripts.shootingPlan', true, CURRENT_TIMESTAMP),
  ('scripts.taskSuggestions', true, CURRENT_TIMESTAMP),
  ('llm.nvidia', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
