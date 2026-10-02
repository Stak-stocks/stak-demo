-- STAK AI: a different question limit for particular accounts (teammates testing, say). Everyone else keeps the
-- shared STAK_AI_WINDOW_LIMIT per STAK_AI_WINDOW_HOURS. Add or change one with:
--   INSERT INTO stak_ai_limits (uid, window_limit, note) VALUES ('<uid>', 50, 'tester')
--     ON CONFLICT (uid) DO UPDATE SET window_limit = EXCLUDED.window_limit, note = EXCLUDED.note;
-- and remove it (back to the normal limit) by deleting the row.
CREATE TABLE IF NOT EXISTS stak_ai_limits (
  uid text PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  window_limit integer NOT NULL CHECK (window_limit BETWEEN 1 AND 1000),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Only the backend (service role) reads or writes it, like the other STAK AI tables.
ALTER TABLE stak_ai_limits ENABLE ROW LEVEL SECURITY;
