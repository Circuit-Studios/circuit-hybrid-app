-- Retire legacy six-stage script analysis flag; shooting-plan is canonical.
DELETE FROM "feature_flags" WHERE "key" = 'scripts.aiAnalysis';
