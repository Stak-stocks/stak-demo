-- STAK AI: let an account have no question limit at all - a null window_limit (teammates testing, say). The apps
-- then hide the count. Remove the row to put the account back on the normal limit.
ALTER TABLE stak_ai_limits ALTER COLUMN window_limit DROP NOT NULL;
