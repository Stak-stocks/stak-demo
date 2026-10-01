-- STAK AI: remember whether an answer was a normal answer, a decline or a question back, so a reopened chat shows
-- declines as declines (no thumbs, the "didn't count" note) rather than as answers.
ALTER TABLE stak_ai_messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'answer' CHECK (kind IN ('answer', 'declined', 'clarify'));
