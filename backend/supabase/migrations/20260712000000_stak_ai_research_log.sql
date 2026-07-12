-- Research cohort flag: auto-set for first 50 users who use Stak AI
ALTER TABLE users ADD COLUMN IF NOT EXISTS research_cohort boolean NOT NULL DEFAULT false;

-- Logs injected context for cohort users so we can review what the AI saw vs. what it said
CREATE TABLE stak_ai_research_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uid         text NOT NULL,
  conversation_id uuid NOT NULL REFERENCES stak_ai_conversations(id) ON DELETE CASCADE,
  user_message    text NOT NULL,
  brands_detected text[],          -- tickers the AI received live context for
  news_headlines  jsonb,           -- headlines injected (array of {ticker, headline})
  live_context    jsonb,           -- price/metrics string per ticker
  ai_response     text NOT NULL,   -- full response for review
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stak_ai_research_log_uid ON stak_ai_research_log(uid);
CREATE INDEX stak_ai_research_log_created ON stak_ai_research_log(created_at DESC);
