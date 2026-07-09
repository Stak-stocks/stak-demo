-- Stak AI: persistent conversation history
CREATE TABLE stak_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid text NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stak_ai_conversations_uid_updated ON stak_ai_conversations(uid, updated_at DESC);

CREATE TABLE stak_ai_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES stak_ai_conversations(id) ON DELETE CASCADE,
  uid text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stak_ai_messages_conv_created ON stak_ai_messages(conversation_id, created_at ASC);
