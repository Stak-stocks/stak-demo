-- STAK AI, phase 1: what a conversation is about, follow-ups that remember the company, and answer feedback.

-- What the chat was opened from (a news article, a stock page, the Daily Brief), and the tickers it last discussed,
-- so "is that normal for it?" still gets that company's live price and news.
ALTER TABLE stak_ai_conversations
  ADD COLUMN IF NOT EXISTS context jsonb,
  ADD COLUMN IF NOT EXISTS last_tickers text[] NOT NULL DEFAULT '{}';

-- Thumbs up (1) / down (-1) on an answer; null until rated.
ALTER TABLE stak_ai_messages
  ADD COLUMN IF NOT EXISTS feedback smallint CHECK (feedback IN (-1, 1));

-- The research log also records the context the AI was given.
ALTER TABLE stak_ai_research_log
  ADD COLUMN IF NOT EXISTS context jsonb;

-- One row per answered question: the per-user rate limit counts these, so deleting a conversation doesn't hand
-- its questions back. Seeded with the current window's questions so nobody's allowance resets on deploy.
CREATE TABLE IF NOT EXISTS stak_ai_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uid text NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stak_ai_usage_uid_created ON stak_ai_usage (uid, created_at DESC);
INSERT INTO stak_ai_usage (uid, created_at)
  SELECT m.uid, m.created_at FROM stak_ai_messages m
  JOIN users u ON u.uid = m.uid
  WHERE m.role = 'user' AND m.created_at >= now() - interval '6 hours'
    AND NOT EXISTS (SELECT 1 FROM stak_ai_usage);
